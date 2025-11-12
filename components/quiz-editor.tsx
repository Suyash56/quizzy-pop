"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Eye,
  Share2,
  Save,
  Edit,
  X,
  Trash2,
  Presentation,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateQuiz } from "@/app/actions/quiz";
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createOption,
  updateOption,
  deleteOption,
} from "@/app/actions/question";
import { toast } from "sonner";
import Link from "next/link";
import { ShareQuizModal } from "@/components/share-quiz-modal";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  settings_json: any;
  created_at: string;
  updated_at: string;
}

interface Option {
  id: string;
  question_id: string;
  order_index: number;
  text: string;
  is_correct: boolean;
  _isNew?: boolean; // Track new options
  _isDeleted?: boolean; // Track deleted options
}

interface Question {
  id: string;
  quiz_id: string;
  order_index: number;
  type: "single" | "multi";
  text: string;
  timer_seconds: number | null;
  options: Option[];
  _isNew?: boolean; // Track new questions
  _isDeleted?: boolean; // Track deleted questions
}

interface QuizEditorProps {
  quiz: Quiz;
  initialQuestions: Question[];
}

export function QuizEditor({
  quiz: initialQuiz,
  initialQuestions,
}: QuizEditorProps) {
  const [quiz, setQuiz] = useState(initialQuiz);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    questions.length > 0 ? questions[0].id : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(quiz.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const selectedQuestion = questions.find(
    (q) => q.id === selectedQuestionId && !q._isDeleted
  );

  // Generate temporary ID for new items
  const generateTempId = () => `temp-${Date.now()}-${Math.random()}`;

  // Update local state and mark as changed
  const markChanged = () => setHasChanges(true);

  // Initialize settings_json if not present
  const settings = quiz.settings_json || {
    fastPointsEnabled: false,
    leaderboardEnabled: true,
    participationEnabled: true,
  };

  const handleToggleSetting = (
    setting: "fastPointsEnabled" | "leaderboardEnabled" | "participationEnabled"
  ) => {
    const newSettings = {
      ...settings,
      [setting]: !settings[setting],
    };
    setQuiz((prev) => ({
      ...prev,
      settings_json: newSettings,
    }));
    markChanged();
  };

  // Quiz title handlers
  const handleTitleChange = (value: string) => {
    setEditedTitle(value);
    setQuiz((prev) => ({ ...prev, title: value }));
    markChanged();
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
  };

  // Question handlers - all local state updates
  const handleAddQuestion = () => {
    const newOrderIndex = questions.filter((q) => !q._isDeleted).length;
    const tempId = generateTempId();
    const newQuestion: Question = {
      id: tempId,
      quiz_id: quiz.id,
      order_index: newOrderIndex,
      type: "single",
      text: "",
      timer_seconds: null,
      options: [],
      _isNew: true,
    };
    setQuestions((prev) => [...prev, newQuestion]);
    setSelectedQuestionId(tempId);
    markChanged();
  };

  const handleUpdateQuestion = (
    field: "text" | "type" | "timer_seconds",
    value: any
  ) => {
    if (!selectedQuestion) return;

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === selectedQuestion.id ? { ...q, [field]: value } : q
      )
    );
    markChanged();
  };

  const handleDeleteQuestion = () => {
    if (!selectedQuestion) return;

    if (selectedQuestion._isNew) {
      // If it's a new question, just remove it
      setQuestions((prev) => prev.filter((q) => q.id !== selectedQuestion.id));
    } else {
      // Mark as deleted
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === selectedQuestion.id ? { ...q, _isDeleted: true } : q
        )
      );
    }

    // Select next question or null
    const remainingQuestions = questions.filter(
      (q) => q.id !== selectedQuestion.id && !q._isDeleted
    );
    setSelectedQuestionId(
      remainingQuestions.length > 0 ? remainingQuestions[0].id : null
    );
    markChanged();
  };

  // Option handlers - all local state updates
  const handleAddOption = () => {
    if (!selectedQuestion) return;

    const currentOptions = selectedQuestion.options.filter(
      (opt) => !opt._isDeleted
    );
    const newOrderIndex = currentOptions.length;
    const tempId = generateTempId();
    const newOption: Option = {
      id: tempId,
      question_id: selectedQuestion.id,
      order_index: newOrderIndex,
      text: "",
      is_correct: false,
      _isNew: true,
    };

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === selectedQuestion.id
          ? { ...q, options: [...(q.options || []), newOption] }
          : q
      )
    );
    markChanged();
  };

  const handleUpdateOption = (
    optionId: string,
    field: "text" | "is_correct",
    value: any
  ) => {
    if (!selectedQuestion) return;

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === selectedQuestion.id
          ? {
              ...q,
              options: (q.options || []).map((opt) =>
                opt.id === optionId ? { ...opt, [field]: value } : opt
              ),
            }
          : q
      )
    );
    markChanged();
  };

  const handleDeleteOption = (optionId: string) => {
    if (!selectedQuestion) return;

    const option = selectedQuestion.options.find((opt) => opt.id === optionId);
    if (!option) return;

    if (option._isNew) {
      // If it's a new option, just remove it
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === selectedQuestion.id
            ? {
                ...q,
                options: (q.options || []).filter((opt) => opt.id !== optionId),
              }
            : q
        )
      );
    } else {
      // Mark as deleted
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === selectedQuestion.id
            ? {
                ...q,
                options: (q.options || []).map((opt) =>
                  opt.id === optionId ? { ...opt, _isDeleted: true } : opt
                ),
              }
            : q
        )
      );
    }
    markChanged();
  };

  const handleToggleCorrectAnswer = (optionId: string) => {
    if (!selectedQuestion) return;

    const option = selectedQuestion.options.find((opt) => opt.id === optionId);
    if (!option) return;

    // For single select, uncheck other options
    if (selectedQuestion.type === "single" && !option.is_correct) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === selectedQuestion.id
            ? {
                ...q,
                options: (q.options || []).map((opt) =>
                  opt.id !== optionId && opt.is_correct
                    ? { ...opt, is_correct: false }
                    : opt
                ),
              }
            : q
        )
      );
    }

    handleUpdateOption(optionId, "is_correct", !option.is_correct);
  };

  // Comprehensive save function
  const handleSave = async () => {
    setIsSaving(true);

    try {
      // 1. Update quiz
      const quizResult = await updateQuiz({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description || undefined,
        settings_json: quiz.settings_json,
      });

      if (quizResult.error) {
        toast.error("Failed to save quiz: " + quizResult.error);
        setIsSaving(false);
        return;
      }

      // 2. Process questions
      const questionsToCreate: Question[] = [];
      const questionsToUpdate: Question[] = [];
      const questionsToDelete: string[] = [];

      questions.forEach((question) => {
        if (question._isDeleted && !question._isNew) {
          questionsToDelete.push(question.id);
        } else if (question._isNew) {
          questionsToCreate.push(question);
        } else {
          // Check if question was modified
          const original = initialQuestions.find((q) => q.id === question.id);
          if (
            original &&
            (original.text !== question.text ||
              original.type !== question.type ||
              original.timer_seconds !== question.timer_seconds)
          ) {
            questionsToUpdate.push(question);
          }
        }
      });

      // 3. Create new questions
      for (const question of questionsToCreate) {
        const result = await createQuestion({
          quiz_id: quiz.id,
          type: question.type,
          text: question.text,
          timer_seconds: question.timer_seconds,
          order_index: question.order_index,
        });

        if (result.error) {
          toast.error(`Failed to create question: ${result.error}`);
          continue;
        }

        // Replace temp ID with real ID
        const newQuestionId = result.data!.id;
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === question.id
              ? { ...result.data!, options: question.options, _isNew: false }
              : q
          )
        );

        // Create options for this new question
        const optionsToCreate = question.options.filter(
          (opt) => !opt._isDeleted
        );
        for (let i = 0; i < optionsToCreate.length; i++) {
          const option = optionsToCreate[i];
          const optionResult = await createOption({
            question_id: newQuestionId,
            text: option.text,
            is_correct: option.is_correct,
            order_index: i,
          });

          if (optionResult.error) {
            toast.error(`Failed to create option: ${optionResult.error}`);
          } else {
            // Update option ID in state
            setQuestions((prev) =>
              prev.map((q) =>
                q.id === newQuestionId
                  ? {
                      ...q,
                      options: q.options.map((opt) =>
                        opt.id === option.id
                          ? { ...optionResult.data!, _isNew: false }
                          : opt
                      ),
                    }
                  : q
              )
            );
          }
        }
      }

      // 4. Update existing questions
      for (const question of questionsToUpdate) {
        const result = await updateQuestion({
          id: question.id,
          text: question.text,
          type: question.type,
          timer_seconds: question.timer_seconds,
        });

        if (result.error) {
          toast.error(`Failed to update question: ${result.error}`);
        }
      }

      // 5. Delete questions
      for (const questionId of questionsToDelete) {
        const result = await deleteQuestion(questionId);
        if (result.error) {
          toast.error(`Failed to delete question: ${result.error}`);
        }
      }

      // 6. Process options for existing questions
      const existingQuestions = questions.filter(
        (q) => !q._isNew && !q._isDeleted
      );
      for (const question of existingQuestions) {
        const originalQuestion = initialQuestions.find(
          (q) => q.id === question.id
        );
        if (!originalQuestion) continue;

        const optionsToCreate: Option[] = [];
        const optionsToUpdate: Option[] = [];
        const optionsToDelete: string[] = [];

        question.options.forEach((option) => {
          if (option._isDeleted && !option._isNew) {
            optionsToDelete.push(option.id);
          } else if (option._isNew) {
            optionsToCreate.push(option);
          } else {
            const originalOption = originalQuestion.options.find(
              (o) => o.id === option.id
            );
            if (
              originalOption &&
              (originalOption.text !== option.text ||
                originalOption.is_correct !== option.is_correct)
            ) {
              optionsToUpdate.push(option);
            }
          }
        });

        // Create new options
        for (let i = 0; i < optionsToCreate.length; i++) {
          const option = optionsToCreate[i];
          const result = await createOption({
            question_id: question.id,
            text: option.text,
            is_correct: option.is_correct,
            order_index: option.order_index,
          });

          if (result.error) {
            toast.error(`Failed to create option: ${result.error}`);
          } else {
            // Update option ID in state
            setQuestions((prev) =>
              prev.map((q) =>
                q.id === question.id
                  ? {
                      ...q,
                      options: q.options.map((opt) =>
                        opt.id === option.id
                          ? { ...result.data!, _isNew: false }
                          : opt
                      ),
                    }
                  : q
              )
            );
          }
        }

        // Update existing options
        for (const option of optionsToUpdate) {
          const result = await updateOption({
            id: option.id,
            text: option.text,
            is_correct: option.is_correct,
          });

          if (result.error) {
            toast.error(`Failed to update option: ${result.error}`);
          }
        }

        // Delete options
        for (const optionId of optionsToDelete) {
          const result = await deleteOption(optionId);
          if (result.error) {
            toast.error(`Failed to delete option: ${result.error}`);
          }
        }
      }

      // Clean up state - remove deleted items and temp flags
      setQuestions((prev) =>
        prev
          .filter((q) => !q._isDeleted)
          .map((q) => ({
            ...q,
            _isNew: false,
            options: (q.options || [])
              .filter((opt) => !opt._isDeleted)
              .map((opt) => ({ ...opt, _isNew: false })),
          }))
      );

      setHasChanges(false);
      toast.success("All changes saved successfully!");
    } catch (error) {
      toast.error("An error occurred while saving");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const sortedOptions = selectedQuestion
    ? [...(selectedQuestion.options || [])]
        .filter((opt) => !opt._isDeleted)
        .sort((a, b) => a.order_index - b.order_index)
    : [];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Left Sidebar - Slides/Questions */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Trophy className="w-8 h-8 text-purple-600" />
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              QuizzyPop
            </h2>
          </div>
        </div>

        {/* Navigation & Questions List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2 mb-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:text-purple-700 border border-gray-200 hover:border-purple-200 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Dashboard</span>
            </Link>
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          <Button
            onClick={handleAddQuestion}
            className="w-full mb-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
            variant="default"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Question
          </Button>
          <div className="space-y-2">
            {questions
              .filter((q) => !q._isDeleted)
              .map((question, index) => (
                <button
                  key={question.id}
                  onClick={() => setSelectedQuestionId(question.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedQuestionId === question.id
                      ? "bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 border border-purple-200 shadow-sm"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        selectedQuestionId === question.id
                          ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white"
                          : "bg-gradient-to-br from-purple-100 to-blue-100 text-purple-700"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="truncate flex-1 leading-snug">
                      {question.text || "Untitled question"}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-8 h-20 flex items-center shadow-sm">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4 h-full">
              {isEditingTitle ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleTitleBlur();
                    }
                  }}
                  className="text-2xl font-bold border-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-0 p-0 h-auto bg-transparent"
                  autoFocus
                />
              ) : (
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {quiz.title || "Untitled Quiz"}
                </h1>
              )}
              {!isEditingTitle && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingTitle(true)}
                  className="h-8 w-8 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {isSaving && (
                <span className="text-xs text-gray-500 font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                  Saving...
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/present/${quiz.id}`}>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Presentation className="w-4 h-4 mr-2" />
                  Present
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareModal(true)}
                className="border-gray-300 hover:bg-gray-50"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={isSaving || !hasChanges}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Editor Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {selectedQuestion ? (
              <div className="space-y-6">
                {/* Question Header with Delete Button */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-6">
                    <Label className="text-base font-semibold text-gray-700">
                      Question Type
                    </Label>
                    <div className="flex gap-3">
                      <Button
                        variant={
                          selectedQuestion.type === "single"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => handleUpdateQuestion("type", "single")}
                        className={
                          selectedQuestion.type === "single"
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md"
                            : "border-gray-300 hover:bg-gray-50"
                        }
                      >
                        Single Select
                      </Button>
                      <Button
                        variant={
                          selectedQuestion.type === "multi"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => handleUpdateQuestion("type", "multi")}
                        className={
                          selectedQuestion.type === "multi"
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md"
                            : "border-gray-300 hover:bg-gray-50"
                        }
                      >
                        Multi Select
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 transition-all"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Question
                  </Button>
                </div>

                {/* Question Text Input */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-gray-700">
                    Question
                  </Label>
                  <Textarea
                    value={selectedQuestion.text}
                    onChange={(e) =>
                      handleUpdateQuestion("text", e.target.value)
                    }
                    placeholder="Enter your question..."
                    className="min-h-[100px] text-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-xl shadow-sm"
                  />
                </div>

                {/* Options Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold text-gray-700">
                      Options
                    </Label>
                  </div>
                  <div className="space-y-3">
                    {sortedOptions.map((option, index) => {
                      const optionColors = [
                        "from-blue-500 to-blue-600",
                        "from-red-500 to-red-600",
                        "from-green-500 to-green-600",
                        "from-yellow-500 to-yellow-600",
                        "from-purple-500 to-purple-600",
                        "from-pink-500 to-pink-600",
                      ];
                      const colorClass =
                        optionColors[index % optionColors.length];

                      return (
                        <div
                          key={option.id}
                          className={`flex items-center gap-3 p-4 border-2 rounded-xl bg-white transition-all hover:shadow-md ${
                            option.is_correct
                              ? "border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <button
                            onClick={() => handleToggleCorrectAnswer(option.id)}
                            className="flex-shrink-0 transition-transform hover:scale-110"
                          >
                            {selectedQuestion.type === "single" ? (
                              <div
                                className={`w-6 h-6 border-2 rounded-full transition-all ${
                                  option.is_correct
                                    ? "bg-gradient-to-r from-purple-600 to-blue-600 border-purple-600 shadow-md"
                                    : "border-gray-400 hover:border-purple-400"
                                }`}
                              >
                                {option.is_correct && (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                className={`w-6 h-6 border-2 rounded transition-all ${
                                  option.is_correct
                                    ? "bg-gradient-to-r from-purple-600 to-blue-600 border-purple-600 shadow-md"
                                    : "border-gray-400 hover:border-purple-400"
                                }`}
                              >
                                {option.is_correct && (
                                  <svg
                                    className="w-full h-full text-white p-0.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            )}
                          </button>
                          <div
                            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md bg-gradient-to-r ${colorClass}`}
                          >
                            {index + 1}
                          </div>
                          <Input
                            value={option.text}
                            onChange={(e) =>
                              handleUpdateOption(
                                option.id,
                                "text",
                                e.target.value
                              )
                            }
                            placeholder={`Option ${index + 1}`}
                            className={`flex-1 border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-lg ${
                              option.is_correct ? "bg-white" : ""
                            }`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteOption(option.id)}
                            className="flex-shrink-0 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    onClick={handleAddOption}
                    variant="outline"
                    className="w-full border-dashed border-2 border-gray-300 hover:border-purple-500 hover:bg-purple-50 text-gray-600 hover:text-purple-600 transition-all rounded-xl py-6"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add option
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center">
                    <Plus className="w-10 h-10 text-purple-600" />
                  </div>
                  <p className="text-gray-600 text-lg font-medium mb-2">
                    No questions yet
                  </p>
                  <p className="text-gray-500 text-sm mb-6">
                    Get started by adding your first question
                  </p>
                  <Button
                    onClick={handleAddQuestion}
                    variant="outline"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add your first question
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Right Sidebar - Settings */}
      <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto shadow-lg">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-8 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Settings
          </h3>

          {selectedQuestion ? (
            <div className="space-y-8">
              {/* Question Settings */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-5 uppercase tracking-wide">
                  Question Settings
                </h4>
                <div className="space-y-5">
                  {/* Timer Settings */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Seconds to answer
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {[15, 30, 45, 60].map((seconds) => (
                        <Button
                          key={seconds}
                          variant={
                            selectedQuestion.timer_seconds === seconds
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            handleUpdateQuestion("timer_seconds", seconds)
                          }
                          className={`min-w-[65px] transition-all ${
                            selectedQuestion.timer_seconds === seconds
                              ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {seconds}s
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Input
                        type="number"
                        placeholder="Custom"
                        value={
                          selectedQuestion.timer_seconds &&
                          ![15, 30, 45, 60].includes(
                            selectedQuestion.timer_seconds
                          )
                            ? String(selectedQuestion.timer_seconds)
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value
                            ? parseInt(e.target.value)
                            : null;
                          handleUpdateQuestion("timer_seconds", value);
                        }}
                        className="w-28 border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-lg"
                        min="1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleUpdateQuestion("timer_seconds", null)
                        }
                        className="text-xs border-gray-300 hover:bg-gray-50"
                      >
                        No timer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Global Quiz Settings */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-5 uppercase tracking-wide">
                  Quiz Settings
                </h4>
                <div className="space-y-4">
                  {/* Leaderboard Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-purple-50 hover:from-purple-50 hover:to-blue-50 transition-all border border-gray-200">
                    <div className="flex-1 flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Add leaderboard
                      </Label>
                      <span
                        className="text-xs text-gray-400 cursor-help w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                        title="Show leaderboard after quiz"
                      >
                        ?
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleSetting("leaderboardEnabled")}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                        settings.leaderboardEnabled
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 shadow-md"
                          : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                          settings.leaderboardEnabled
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center">
                <Edit className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm text-gray-500 font-medium">
                Select a question to configure settings
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Delete Question Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleDeleteQuestion();
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Quiz Modal */}
      <ShareQuizModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        quizId={quiz.id}
        quizTitle={quiz.title}
        participationEnabled={settings.participationEnabled ?? true}
        onToggleParticipation={(enabled) => {
          // Update local state to reflect the change (already saved to DB by modal)
          const newSettings = {
            ...settings,
            participationEnabled: enabled,
          };
          setQuiz((prev) => ({
            ...prev,
            settings_json: newSettings,
          }));
          // Don't mark as changed since it's saved directly to DB
        }}
      />
    </div>
  );
}
