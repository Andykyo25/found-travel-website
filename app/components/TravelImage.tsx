import Image from "next/image";

export function TravelImage({
  src,
  alt,
  className,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw",
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  // Optimize local assets and the established photo provider. Other editor URLs
  // retain their original rendering without opening the server image proxy.
  const optimizable =
    (src.startsWith("/") &&
      !src.startsWith("//") &&
      !src.startsWith("/api/")) ||
    src.startsWith("https://images.unsplash.com/");
  if (optimizable)
    return (
      <Image
        src={src}
        alt={alt}
        className={className}
        width={1600}
        height={1000}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
      />
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      width={1600}
      height={1000}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );
}
