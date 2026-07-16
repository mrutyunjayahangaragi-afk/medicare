"use client";

interface HeadingProps {
  badge: string;
  titlePrefix: string;
  titleHighlight: string;
  description?: string;
  align?: "center" | "left";
}

export default function SectionHeading({
  badge,
  titlePrefix,
  titleHighlight,
  description,
  align = "center",
}: HeadingProps) {
  const isLeft = align === "left";

  return (
    <div className={`mb-12 lg:mb-16 flex flex-col ${isLeft ? "text-left items-start" : "text-center items-center"}`}>
      <span className="section-badge">
        {badge}
      </span>
      <h2 className="section-title mb-4">
        {titlePrefix} <span className="red-gradient-text">{titleHighlight}</span>
      </h2>
      {description && (
        <p className="section-desc">
          {description}
        </p>
      )}
    </div>
  );
}
