"use client";

import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/** Falls back to a neutral placeholder if the image fails to load, instead of a broken-image icon. */
export function SafeImage({ className, alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/20 text-muted",
          props.fill && "h-full w-full",
          className,
        )}
        style={!props.fill ? { width: props.width, height: props.height } : undefined}
      >
        <ImageOff className="h-8 w-8" aria-hidden />
      </div>
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
