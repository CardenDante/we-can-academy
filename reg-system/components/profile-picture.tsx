"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, User } from "lucide-react";

// Profile picture upload helper function
export async function uploadProfilePicture(studentId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("studentId", studentId);

  const response = await fetch("/api/students/profile-picture", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload profile picture");
  }

  const data = await response.json();
  return data.profilePictureUrl;
}

// Profile picture delete helper function
export async function deleteProfilePicture(studentId: string): Promise<void> {
  const response = await fetch(`/api/students/profile-picture?studentId=${studentId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete profile picture");
  }
}

// Default avatar SVG components
export function MaleAvatar({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="64" cy="64" r="64" fill="#E3F2FD" />
      <circle cx="64" cy="50" r="24" fill="#1976D2" />
      <path
        d="M64 80c-22 0-40 12-40 28v20h80v-20c0-16-18-28-40-28z"
        fill="#1976D2"
      />
      <circle cx="64" cy="50" r="20" fill="#FFCCBC" />
      <path
        d="M44 42c0-11 9-20 20-20s20 9 20 20"
        stroke="#5D4037"
        strokeWidth="8"
        fill="none"
      />
      <ellipse cx="56" cy="50" rx="2" ry="3" fill="#5D4037" />
      <ellipse cx="72" cy="50" rx="2" ry="3" fill="#5D4037" />
      <path
        d="M58 60c3 3 9 3 12 0"
        stroke="#5D4037"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function FemaleAvatar({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="64" cy="64" r="64" fill="#FCE4EC" />
      <circle cx="64" cy="50" r="24" fill="#E91E63" />
      <path
        d="M64 80c-22 0-40 12-40 28v20h80v-20c0-16-18-28-40-28z"
        fill="#E91E63"
      />
      <circle cx="64" cy="50" r="20" fill="#FFCCBC" />
      <path
        d="M40 38c0-13 11-24 24-24s24 11 24 24c0 4-1 8-3 11"
        stroke="#5D4037"
        strokeWidth="10"
        fill="none"
      />
      <path
        d="M36 45c-2 8-1 16 2 20"
        stroke="#5D4037"
        strokeWidth="6"
        fill="none"
      />
      <path
        d="M92 45c2 8 1 16-2 20"
        stroke="#5D4037"
        strokeWidth="6"
        fill="none"
      />
      <ellipse cx="56" cy="50" rx="2" ry="3" fill="#5D4037" />
      <ellipse cx="72" cy="50" rx="2" ry="3" fill="#5D4037" />
      <path
        d="M58 60c3 3 9 3 12 0"
        stroke="#5D4037"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

interface ProfilePictureDisplayProps {
  profilePictureUrl?: string | null;
  gender: "MALE" | "FEMALE";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProfilePictureDisplay({
  profilePictureUrl,
  gender,
  size = "md",
  className = "",
}: ProfilePictureDisplayProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  if (profilePictureUrl) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 border-white shadow-lg ${className}`}
      >
        <img
          src={profilePictureUrl}
          alt="Profile"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Show gender-based default avatar
  if (gender === "MALE") {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 border-white shadow-lg ${className}`}
      >
        <MaleAvatar className="w-full h-full" />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 border-white shadow-lg ${className}`}
    >
      <FemaleAvatar className="w-full h-full" />
    </div>
  );
}

interface ProfilePictureUploadProps {
  onImageCapture: (imageData: string | null, file?: File | null) => void;
  initialImage?: string | null;
  gender?: "MALE" | "FEMALE" | "";
}

export function ProfilePictureUpload({
  onImageCapture,
  initialImage = null,
  gender = "",
}: ProfilePictureUploadProps) {
  const [preview, setPreview] = useState<string | null>(initialImage);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      setStream(mediaStream);
      setShowCamera(true);

      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions or use file upload.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Convert to base64 and blob/file
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "profile-picture.jpg", { type: "image/jpeg" });
            const imageData = canvas.toDataURL("image/jpeg", 0.7);
            setPreview(imageData);
            setCapturedFile(file);
            onImageCapture(imageData, file);
          }
        }, "image/jpeg", 0.7);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress image before storing
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSize = 400;
          let { width, height } = img;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to both base64 and File object
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, { type: "image/jpeg" });
              const compressedData = canvas.toDataURL("image/jpeg", 0.7);
              setPreview(compressedData);
              setCapturedFile(compressedFile);
              onImageCapture(compressedData, compressedFile);
            }
          }, "image/jpeg", 0.7);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPreview(null);
    setCapturedFile(null);
    onImageCapture(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4">
        {/* Preview Area */}
        <div className="relative">
          {showCamera ? (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-48 h-48 rounded-full object-cover border-4 border-primary/20"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
          ) : preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-48 h-48 rounded-full object-cover border-4 border-green-500/30"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="w-48 h-48 rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
              {gender === "MALE" ? (
                <MaleAvatar className="w-36 h-36 opacity-50" />
              ) : gender === "FEMALE" ? (
                <FemaleAvatar className="w-36 h-36 opacity-50" />
              ) : (
                <User className="w-20 h-20 text-muted-foreground/30" />
              )}
            </div>
          )}
        </div>

        {/* Camera Controls */}
        {showCamera ? (
          <div className="flex gap-2">
            <Button type="button" onClick={capturePhoto} className="gap-2">
              <Camera className="h-4 w-4" />
              Capture
            </Button>
            <Button type="button" variant="outline" onClick={stopCamera}>
              Cancel
            </Button>
          </div>
        ) : !preview ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={startCamera}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={startCamera}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Retake
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Change
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Optional - Take a photo or upload an image
      </p>
    </div>
  );
}
