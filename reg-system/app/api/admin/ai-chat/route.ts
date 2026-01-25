import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, history } = body as {
      message: string;
      history: Message[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get database statistics and relevant data based on the question
    const databaseContext = await getDatabaseContext(message);

    // Prepare messages for Claude
    const messages: Anthropic.MessageParam[] = [
      // Add conversation history
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      // Add current message with database context
      {
        role: "user" as const,
        content: `${message}\n\nHere's the current database information that might be relevant:\n${databaseContext}`,
      },
    ];

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: `You are a helpful AI assistant for the We Can Academy registration system. You have read-only access to the database and can help answer questions about students, courses, teachers, attendance, check-ins, weekends, and chapel sessions.

Your role is to:
- Analyze the provided database information
- Answer questions clearly and concisely
- Provide insights and trends when asked
- Help administrators understand their data
- Suggest useful queries or reports

Important:
- You can only READ data, not modify it
- Be accurate with numbers and statistics
- If you don't have enough information, say so
- Format responses in a clear, readable way
- Use bullet points and formatting when helpful`,
      messages,
    });

    // Extract the response text
    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}

/**
 * Get relevant database context based on the user's question
 * This function queries the database for information that might be relevant
 */
async function getDatabaseContext(question: string): Promise<string> {
  const lowerQuestion = question.toLowerCase();
  const context: string[] = [];

  try {
    // Always include basic counts
    const [
      studentCount,
      userCount,
      courseCount,
      classCount,
      teacherCount,
      weekendCount,
      sessionCount,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.user.count(),
      prisma.course.count(),
      prisma.class.count(),
      prisma.teacher.count(),
      prisma.weekend.count(),
      prisma.session.count(),
    ]);

    context.push(`**System Overview:**`);
    context.push(`- Total Students: ${studentCount}`);
    context.push(`- Total Users: ${userCount}`);
    context.push(`- Total Courses: ${courseCount}`);
    context.push(`- Total Classes: ${classCount}`);
    context.push(`- Total Teachers: ${teacherCount}`);
    context.push(`- Total Weekends: ${weekendCount}`);
    context.push(`- Total Sessions: ${sessionCount}`);
    context.push("");

    // Student-related queries
    if (
      lowerQuestion.includes("student") ||
      lowerQuestion.includes("enrollment")
    ) {
      const studentsByCourse = await prisma.student.groupBy({
        by: ["courseId"],
        _count: true,
        orderBy: {
          _count: {
            courseId: "desc",
          },
        },
      });

      const coursesWithCounts = await Promise.all(
        studentsByCourse.map(async (item: any) => {
          const course = await prisma.course.findUnique({
            where: { id: item.courseId },
          });
          return {
            course: course?.name || "Unknown",
            count: item._count,
          };
        })
      );

      context.push(`**Students by Course:**`);
      coursesWithCounts.forEach((item: { course: string; count: number }) => {
        context.push(`- ${item.course}: ${item.count} students`);
      });
      context.push("");
    }

    // Attendance-related queries
    if (
      lowerQuestion.includes("attendance") ||
      lowerQuestion.includes("present") ||
      lowerQuestion.includes("absent")
    ) {
      const totalAttendance = await prisma.attendance.count();

      context.push(`**Attendance Statistics:**`);
      context.push(`- Total attendance records: ${totalAttendance}`);
      context.push(`- Note: Attendance records indicate students who were present at sessions`);
      context.push("");

      // Recent attendance
      const recentAttendance = await prisma.attendance.findMany({
        take: 5,
        orderBy: { markedAt: "desc" },
        include: {
          student: true,
          session: true,
        },
      });

      if (recentAttendance.length > 0) {
        context.push(`**Recent Attendance:**`);
        recentAttendance.forEach((att: any) => {
          context.push(
            `- ${att.student.fullName} - ${att.session.name} (Present)`
          );
        });
        context.push("");
      }
    }

    // Check-in related queries
    if (lowerQuestion.includes("check") || lowerQuestion.includes("weekend")) {
      const totalCheckIns = await prisma.checkIn.count();
      const recentCheckIns = await prisma.checkIn.findMany({
        take: 5,
        orderBy: { checkedAt: "desc" },
        include: {
          student: true,
          weekend: true,
        },
      });

      context.push(`**Check-in Statistics:**`);
      context.push(`- Total check-ins: ${totalCheckIns}`);
      context.push("");

      if (recentCheckIns.length > 0) {
        context.push(`**Recent Check-ins:**`);
        recentCheckIns.forEach((check: any) => {
          context.push(
            `- ${check.student.fullName} - ${check.weekend.name} (${check.day})`
          );
        });
        context.push("");
      }
    }

    // Teacher-related queries
    if (lowerQuestion.includes("teacher") || lowerQuestion.includes("staff")) {
      const teachers = await prisma.teacher.findMany({
        include: {
          user: true,
          class: {
            include: {
              course: true,
            },
          },
        },
      });

      context.push(`**Teachers:**`);
      teachers.forEach((teacher: any) => {
        context.push(
          `- ${teacher.user.name}: ${teacher.class.course.name} - ${teacher.class.name}`
        );
      });
      context.push("");
    }

    // Course-related queries
    if (lowerQuestion.includes("course") || lowerQuestion.includes("class")) {
      const courses = await prisma.course.findMany({
        include: {
          _count: {
            select: {
              students: true,
            },
          },
        },
      });

      context.push(`**Courses:**`);
      courses.forEach((course: any) => {
        context.push(
          `- ${course.name}: ${course._count.students} students`
        );
      });
      context.push("");
    }

    // Session-related queries
    if (lowerQuestion.includes("session") || lowerQuestion.includes("chapel")) {
      const sessions = await prisma.session.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          weekend: true,
        },
      });

      context.push(`**Recent Sessions:**`);
      sessions.forEach((session: any) => {
        context.push(
          `- ${session.name} (${session.sessionType}) - ${session.weekend?.name || "No weekend"}`
        );
      });
      context.push("");
    }

    return context.join("\n");
  } catch (error) {
    console.error("Error getting database context:", error);
    return "Error retrieving database information.";
  }
}
