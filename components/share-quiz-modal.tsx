"use client";

import { useState, useEffect } from "react";
import { Copy, Download, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { updateParticipationSetting } from "@/app/actions/quiz";

interface ShareQuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  quizTitle: string;
  participationEnabled: boolean;
  onToggleParticipation: (enabled: boolean) => void;
}

export function ShareQuizModal({
  open,
  onOpenChange,
  quizId,
  quizTitle,
  participationEnabled,
  onToggleParticipation,
}: ShareQuizModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isUpdatingParticipation, setIsUpdatingParticipation] = useState(false);
  const [localParticipationEnabled, setLocalParticipationEnabled] =
    useState(participationEnabled);

  // Sync with prop changes
  useEffect(() => {
    setLocalParticipationEnabled(participationEnabled);
  }, [participationEnabled]);

  // Generate participation link
  const participationLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${quizId}`
      : "";

  // Generate QR code URL
  useEffect(() => {
    if (participationLink) {
      const encodedUrl = encodeURIComponent(participationLink);
      setQrCodeUrl(
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`
      );
    }
  }, [participationLink]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(participationLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleDownloadQR = async () => {
    if (!qrCodeUrl) return;

    try {
      const response = await fetch(qrCodeUrl, { mode: "cors" });
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Open in new tab
      window.open(blobUrl, "_blank");

      // Trigger download
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `quiz-${quizId}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
      toast.success("QR code opened and downloaded!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to open or download QR code!");
    }
  };

  const handleToggleParticipation = async (checked: boolean) => {
    setLocalParticipationEnabled(checked);
    setIsUpdatingParticipation(true);

    const result = await updateParticipationSetting(quizId, checked);

    setIsUpdatingParticipation(false);

    if (result.error) {
      toast.error("Failed to update participation setting");
      setLocalParticipationEnabled(!checked); // Revert on error
    } else {
      toast.success(
        checked ? "Participation enabled" : "Participation disabled"
      );
      onToggleParticipation(checked);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Share {quizTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Participation Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-900">
              Participation link
            </Label>
            <div className="flex gap-2">
              <Input
                value={participationLink}
                readOnly
                className="flex-1 bg-gray-50 text-sm font-mono"
              />
              <Button
                onClick={handleCopyLink}
                className="min-w-[90px] bg-gray-900 text-white hover:bg-gray-800 hover:text-white border-gray-900"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* QR Code Access */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-900">
                  QR code access
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Participants can join your quiz using this QR code.
                </p>
              </div>
              <Button onClick={handleDownloadQR} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
            {qrCodeUrl && (
              <div className="flex justify-center mt-4">
                <div className="border-2 border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                  <img src={qrCodeUrl} alt="QR Code" className="w-36 h-36" />
                </div>
              </div>
            )}
          </div>

          {/* Enable Participation Toggle */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <Label className="text-sm font-medium text-gray-900 block">
                  Enable participation
                </Label>
                <p className="text-sm text-gray-600">
                  Anyone with the link, voting code, or QR code can join and
                  interact with your quiz.
                </p>
              </div>
              <div className="relative">
                <Switch
                  checked={localParticipationEnabled}
                  onCheckedChange={handleToggleParticipation}
                  disabled={isUpdatingParticipation}
                />
                {isUpdatingParticipation && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-full z-10 shadow-sm">
                    <Loader2
                      className="h-4 w-4 animate-spin text-purple-600"
                      strokeWidth={2.5}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
