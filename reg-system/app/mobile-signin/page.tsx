import { redirect } from "next/navigation";

export default async function MobileSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { code, error } = params;

  // If we have a code, redirect to the API route that will handle auth
  if (code) {
    redirect(`/api/mobile/signin?code=${code}`);
  }

  // Determine error message
  let errorTitle = "Authentication Failed";
  let errorMessage = "Unknown error occurred";

  if (error === "no_code") {
    errorMessage = "No authentication code provided";
  } else if (error === "invalid_code") {
    errorMessage = "Invalid or expired code. Please try again from the mobile app.";
  } else if (error === "user_not_found") {
    errorMessage = "User not found. Please contact support.";
  } else if (error === "server_error") {
    errorMessage = "Server error occurred. Please try again.";
  } else if (!error) {
    errorMessage = "No authentication code provided";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {errorTitle}
        </h2>
        <p className="text-gray-600 mb-4">{errorMessage}</p>
      </div>
    </div>
  );
}
