'use client'

import useSWRImmutable from "swr";
import remarkGfm from "remark-gfm";
import remarkGithub from "remark-github";
import Markdown from "react-markdown";

const messages = {
  "en-US": {
    loading: "Loading latest release...",
    rateLimited:
      "Unable to load the latest release because GitHub API rate limits were reached. Please check GitHub directly for the latest updates.",
    rateLimitReset: "Rate limit resets at:",
    unableToLoad: "Unable to load the latest release. Please check GitHub for the latest updates.",
    viewAllReleases: "View all releases on GitHub",
    published: "Published",
  },
  "fr-FR": {
    loading: "Chargement de la dernière release...",
    rateLimited:
      "Impossible de charger la dernière release, car la limite d'API GitHub a été atteinte. Consultez GitHub directement pour les dernières mises à jour.",
    rateLimitReset: "La limite se réinitialise à :",
    unableToLoad: "Impossible de charger la dernière release. Consultez GitHub pour les dernières mises à jour.",
    viewAllReleases: "Voir toutes les releases sur GitHub",
    published: "Publié le",
  },
};

export default function LatestRelease({ repo, locale = "en-US" }) {
  const copy = messages[locale] || messages["en-US"];
  // Use our API route instead of direct GitHub API
  // This provides server-side caching and better rate limit handling
  const apiUrl = `/api/github/releases/${repo}`;
  const repoUrl = `https://github.com/openmrs/${repo}/releases`;

  const fetcher = async (url) => {
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle rate limiting from our API route
      if (response.status === 429 || errorData.error === "RATE_LIMIT") {
        const error = new Error("RATE_LIMIT");
        error.rateLimitReset = errorData.rateLimitReset;
        throw error;
      }

      throw new Error(errorData.message || `Failed to fetch releases for ${repo}`);
    }

    return response.json();
  };

  const { data, error } = useSWRImmutable(apiUrl, fetcher, {
    // Retry with exponential backoff, but not for rate limits
    shouldRetryOnError: (error) => error?.message !== "RATE_LIMIT",
    errorRetryCount: 2,
    errorRetryInterval: 5000,
  });

  const releasesLink = (
    <p className="py-2 text-sm font-medium">
      <a className="underline nx-text-primary-600" href={repoUrl} rel="noopener noreferrer" target="_blank">
        {copy.viewAllReleases}
      </a>
    </p>
  );

  if (error) {
    const isRateLimit = error.message === "RATE_LIMIT";
    const rateLimitReset = error.rateLimitReset;

    return (
      <div className="py-4 space-y-2 prose dark:prose-invert">
        {isRateLimit ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {copy.rateLimited}
            </p>
            {rateLimitReset && (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {copy.rateLimitReset} {new Date(rateLimitReset).toLocaleString(locale)}
              </p>
            )}
            {releasesLink}
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {copy.unableToLoad}
            </p>
            {releasesLink}
          </>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-4 space-y-2 prose dark:prose-invert">
        <p className="text-sm text-gray-600 dark:text-gray-400">{copy.loading}</p>
        {releasesLink}
      </div>
    );
  }

  const latestRelease = data;
  const publishedDate = latestRelease?.published_at
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(latestRelease.published_at))
    : null;

  return (
    <div className="py-4 space-y-2 prose dark:prose-invert">
      <p className="text-lg font-bold">{latestRelease?.name || latestRelease?.tag_name}</p>

      {publishedDate && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {copy.published}: {publishedDate}
        </p>
      )}

      <Markdown
        children={latestRelease?.body}
        remarkPlugins={[remarkGfm, [remarkGithub, { repository: `https://github.com/openmrs/${repo}` }]]}
      />

      {releasesLink}
    </div>
  );
}
