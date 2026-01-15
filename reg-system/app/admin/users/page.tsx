import { getUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUsers } from "@/app/actions/users";
import { CreateUserForm } from "./create-user-form";
import { DeleteUserButton } from "./delete-user-button";
import { BackButton } from "@/components/back-button";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const user = await getUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const users = await getUsers();

  return (
    <div className="min-h-screen bg-background">
      <Header user={{ name: user.name!, role: user.role }} />
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BackButton href="/admin" />

        <div className="mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground mb-2 sm:mb-3">
            Users Management
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-light">
            Manage system users and roles
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3">
          <Card className="luxury-card border-0 lg:col-span-2 order-2 lg:order-1">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">All Users</CardTitle>
              <CardDescription className="text-sm font-light">
                {users.length} user{users.length !== 1 ? "s" : ""} in the system
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-4">Username</TableHead>
                    <TableHead className="hidden sm:table-cell">Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-right pr-4 sm:pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium pl-4 sm:pl-4">{u.username}</TableCell>
                      <TableCell className="hidden sm:table-cell">{u.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right pr-4 sm:pr-4">
                        <DeleteUserButton userId={u.id} username={u.username} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="luxury-card border-0 order-1 lg:order-2">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-xl sm:text-2xl font-light tracking-tight">Create User</CardTitle>
              <CardDescription className="text-sm font-light">Add a new system user</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateUserForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
