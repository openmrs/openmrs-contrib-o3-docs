'use client'

import { useEffect, useState } from "react";
import { useTheme } from "nextra-theme-docs";
import Image from "next/image";

function AdaptiveLogo({ height = 180, width = 350 }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // next/image with `unoptimized` does not prefix the basePath onto the src, so
  // we add it ourselves for project-subpath / PR-preview deployments.
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const darkLogo = `${basePath}/logo-dark.svg`;
  const lightLogo = `${basePath}/logo-light.svg`;

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedLogo =
    theme === "dark" || (theme === "system" && resolvedTheme === "dark")
      ? darkLogo
      : lightLogo;
  const logoSrc = mounted ? resolvedLogo : lightLogo;

  return (
    <Image
      className="mx-auto"
      style={{ width, height }}
      src={logoSrc}
      alt="OpenMRS logo"
      priority
      sizes="(max-width: 640px) 220px, (max-width: 1024px) 280px, 350px"
      height={height}
      width={width}
    />
  );
}

export default AdaptiveLogo;
