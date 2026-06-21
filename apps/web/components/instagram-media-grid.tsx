"use client";

import Image from "next/image";
import {
  ArrowUpRight,
  Image as ImageIcon,
  Images,
  Play,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type InstagramPost = {
  id: string;
  permalink: string;
  type: string;
  caption: string;
  image_url: string;
  video_url: string | null;
  taken_at: string;
  like_count: number;
  comment_count: number;
};

type InstagramMediaGridProps = {
  instagramUrl: string;
  posts: InstagramPost[];
  username: string;
};

function getPostPreview(caption: string) {
  return (
    caption
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? "Detroit Metro Men post"
  );
}

function formatPostDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function PostTypeIcon({ size, type }: { size: number; type: string }) {
  if (type === "video") {
    return <Play size={size} />;
  }

  if (type === "carousel") {
    return <Images size={size} />;
  }

  return <ImageIcon size={size} />;
}

function InstagramTile({
  onOpen,
  post
}: {
  onOpen: () => void;
  post: InstagramPost;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = Boolean(post.video_url);
  const isCarousel = post.type === "carousel";

  function handleMouseEnter() {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => {
      // Some Instagram CDN video URLs may expire or block playback.
    });
  }

  function handleMouseLeave() {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.pause();
    videoRef.current.currentTime = 0;
  }

  return (
    <button
      className={`instagram-tile${isVideo ? " instagram-tile-video" : ""}${
        isCarousel ? " instagram-tile-carousel" : ""
      }`}
      onClick={onOpen}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      type="button"
    >
      <Image
        src={post.image_url}
        alt={getPostPreview(post.caption)}
        width={240}
        height={240}
        sizes="(max-width: 640px) 33vw, 180px"
      />
      {post.video_url ? (
        <video
          aria-hidden="true"
          className="instagram-hover-video"
          loop
          muted
          playsInline
          preload="metadata"
          ref={videoRef}
          src={post.video_url}
        />
      ) : null}
      <span className="instagram-tile-badge" aria-label={post.type} title={post.type}>
        <PostTypeIcon size={15} type={post.type} />
      </span>
    </button>
  );
}

export function InstagramMediaGrid({
  instagramUrl,
  posts,
  username
}: InstagramMediaGridProps) {
  const [activePost, setActivePost] = useState<InstagramPost | null>(null);
  const lightbox = activePost ? (
    <div
      aria-labelledby="instagram-dialog-title"
      aria-modal="true"
      className="instagram-lightbox"
      role="dialog"
    >
      <button
        aria-label="Close Instagram post preview"
        className="instagram-lightbox-backdrop"
        onClick={() => setActivePost(null)}
        type="button"
      />
      <div className="instagram-lightbox-panel">
        <button
          aria-label="Close Instagram post preview"
          className="instagram-lightbox-close"
          onClick={() => setActivePost(null)}
          type="button"
        >
          <X size={22} />
        </button>

        <div className="instagram-lightbox-media">
          {activePost.video_url ? (
            <video
              autoPlay
              controls
              playsInline
              poster={activePost.image_url}
              src={activePost.video_url}
            />
          ) : (
            <Image
              alt={getPostPreview(activePost.caption)}
              height={900}
              src={activePost.image_url}
              width={900}
            />
          )}
        </div>

        <div className="instagram-lightbox-copy">
          <div>
            <p className="instagram-lightbox-type">
              <PostTypeIcon size={16} type={activePost.type} />
              <span>{formatPostDate(activePost.taken_at)}</span>
            </p>
            <h2 id="instagram-dialog-title">{getPostPreview(activePost.caption)}</h2>
          </div>
          <p>{activePost.caption}</p>
          <div className="instagram-lightbox-meta">
            <span>{formatPostDate(activePost.taken_at)}</span>
            <span>{activePost.like_count} likes</span>
            <span>{activePost.comment_count} comments</span>
          </div>
          <a href={activePost.permalink} rel="noreferrer" target="_blank">
            Open on Instagram
            <ArrowUpRight size={18} />
          </a>
        </div>
      </div>
    </div>
  ) : null;

  useEffect(() => {
    if (!activePost) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePost(null);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePost]);

  return (
    <>
      <section className="instagram-preview" aria-labelledby="instagram-preview-title">
        <div className="instagram-preview-heading">
          <div>
            <p className="event-register-date">Recent Instagram posts</p>
            <h2 id="instagram-preview-title">@{username}</h2>
          </div>
          <a className="instagram-follow-link" href={instagramUrl} rel="noreferrer" target="_blank">
            Follow on Instagram
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </div>

        <div className="instagram-grid">
          {posts.map((post) => (
            <InstagramTile key={post.id} onOpen={() => setActivePost(post)} post={post} />
          ))}
        </div>
      </section>

      {lightbox ? createPortal(lightbox, document.body) : null}
    </>
  );
}
