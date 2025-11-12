"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createQuiz } from "@/app/actions/quiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function CreateQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }

    setIsCreating(true);
    const result = await createQuiz({
      title: title.trim(),
      description: description.trim() || undefined,
    });

    setIsCreating(false);

    if (result.error) {
      toast.error("Failed to create quiz: " + result.error);
    } else if (result.data) {
      toast.success("Quiz created successfully!");
      router.push(`/quiz/${result.data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8">
          <h1 className="text-3xl font-semibold mb-6">Create New Quiz</h1>
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quiz title"
                required
                disabled={isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter quiz description (optional)"
                disabled={isCreating}
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isCreating || !title.trim()}
                className="flex-1"
              >
                {isCreating ? "Creating..." : "Create Quiz"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isCreating}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

