import remarkGfm from "remark-gfm";
import remarkGithub from "remark-github";
import Markdown from "react-markdown";

// Release data is baked at build time by scripts/fetch-releases.mjs. On GitHub
// Pages there is no server to proxy the GitHub API per request, so we render the
// last-fetched release statically and rely on a scheduled rebuild to refresh it.
import releases from "@/data/releases.json";

const messages = {
  "en-US": {
    unavailable: "The latest release could not be loaded. Please check GitHub for the latest updates.",
    viewAllReleases: "View all releases on GitHub",
    published: "Published",
  },
  "fr-FR": {
    unavailable: "Impossible de charger la dernière release. Consultez GitHub pour les dernières mises à jour.",
    viewAllReleases: "Voir toutes les releases sur GitHub",
    published: "Publié le",
  },
};

export default function LatestRelease({ repo, locale = "en-US" }) {
  const copy = messages[locale] || messages["en-US"];
  const repoUrl = `https://github.com/openmrs/${repo}/releases`;
  const release = releases[repo];

  const releasesLink = (
    <p className="py-2 text-sm font-medium">
      <a className="underline nx-text-primary-600" href={repoUrl} rel="noopener noreferrer" target="_blank">
        {copy.viewAllReleases}
      </a>
    </p>
  );

  if (!release) {
    return (
      <div className="py-4 space-y-2 prose dark:prose-invert">
        <p className="text-sm text-gray-600 dark:text-gray-400">{copy.unavailable}</p>
        {releasesLink}
      </div>
    );
  }

  const publishedDate = release.published_at
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(release.published_at))
    : null;

  return (
    <div className="py-4 space-y-2 prose dark:prose-invert">
      <p className="text-lg font-bold">{release.name || release.tag_name}</p>

      {publishedDate && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {copy.published}: {publishedDate}
        </p>
      )}

      <Markdown
        children={release.body}
        remarkPlugins={[remarkGfm, [remarkGithub, { repository: `https://github.com/openmrs/${repo}` }]]}
      />

      {releasesLink}
    </div>
  );
}
