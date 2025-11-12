"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { updatePassword, updateAvatar } from "@/app/actions/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload, User, Lock } from "lucide-react";

interface AccountSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      avatar_url?: string;
      name?: string;
      full_name?: string;
    };
  };
}

export function AccountSettingsModal({
  open,
  onOpenChange,
  user,
}: AccountSettingsModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(
    user.user_metadata?.avatar_url || ""
  );
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setAvatarUrl(user.user_metadata?.avatar_url || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open, user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Convert file to base64 data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarUrl(base64String);
        setIsUploadingAvatar(false);
        toast.success("Avatar uploaded successfully!");
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to upload avatar");
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!avatarUrl) {
      toast.error("Please upload an avatar image");
      return;
    }

    setIsUpdatingAvatar(true);
    try {
      const result = await updateAvatar(avatarUrl);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Avatar updated successfully!");
        onOpenChange(false);
        window.location.reload(); // Reload to show updated avatar
      }
    } catch (error) {
      toast.error("Failed to update avatar");
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const result = await updatePassword(currentPassword, newPassword);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      toast.error("Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const userName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <User className="w-6 h-6" />
            Account Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 mt-4">
          {/* Avatar Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Profile Picture
              </h3>
            </div>

            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-gray-200">
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    disabled={isUploadingAvatar}
                    className="w-full sm:w-auto"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Image
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG or GIF. Max size 5MB
                  </p>
                </div>

                {avatarUrl && (
                  <Button
                    onClick={handleSaveAvatar}
                    disabled={isUpdatingAvatar}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isUpdatingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Avatar"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Password Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Change Password
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="w-full"
                />
              </div>

              <Button
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword}
                className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </div>

          {/* Account Info */}
          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
