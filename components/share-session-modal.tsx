"use client";

import { useState, useEffect } from "react";
import { Copy, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ShareSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  quizTitle: string;
  roomCode: string;
}

export function ShareSessionModal({
  open,
  onOpenChange,
  quizId,
  quizTitle,
  roomCode,
}: ShareSessionModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            Share {quizTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Room Code */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-300">
              Room Code
            </Label>
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <p className="text-3xl font-mono font-bold text-purple-400 text-center">
                {roomCode}
              </p>
              <p className="text-sm text-gray-400 text-center mt-2">
                Share this code with participants to join
              </p>
            </div>
          </div>

          {/* Participation Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-300">
              Participation link
            </Label>
            <div className="flex gap-2">
              <Input
                value={participationLink}
                readOnly
                className="flex-1 bg-gray-700 text-white text-sm font-mono border-gray-600"
              />
              <Button
                onClick={handleCopyLink}
                className="min-w-[90px] bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
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
                <Label className="text-sm font-medium text-gray-300">
                  QR code access
                </Label>
                <p className="text-sm text-gray-400 mt-1">
                  Participants can join your quiz using this QR code.
                </p>
              </div>
              <Button
                onClick={handleDownloadQR}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600 hover:text-white cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
            {qrCodeUrl && (
              <div className="flex justify-center mt-4">
                <div className="border-2 border-gray-600 rounded-lg p-3 bg-white shadow-sm">
                  <img src={qrCodeUrl} alt="QR Code" className="w-36 h-36" />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

