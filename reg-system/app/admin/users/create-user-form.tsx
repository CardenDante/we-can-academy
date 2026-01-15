"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUser } from "@/app/actions/users";

export function CreateUserForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const data = {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      name: formData.get("name") as string,
      role: selectedRole as "ADMIN" | "CASHIER" | "STAFF" | "SECURITY",
    };

    if (!data.role) {
      setError("Please select a role");
      setLoading(false);
      return;
    }

    try {
      await createUser(data);
      setSuccess("User created successfully!");
      setSelectedRole("");
      setFormKey(prev => prev + 1);
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      <div>
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <Select value={selectedRole} onValueChange={setSelectedRole} required>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="CASHIER">Cashier</SelectItem>
            <SelectItem value="STAFF">Staff</SelectItem>
            <SelectItem value="SECURITY">Security</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-500/10 text-green-600 text-sm rounded-md">
          {success}
        </div>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}
