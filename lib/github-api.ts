/* ============================
   GitHub API for Commit Tracking
============================ */

const GITHUB_API_BASE = "https://api.github.com";

export interface GitHubUser {
  login: string;
  avatar_url: string;
  profile_url: string;
  public_repos: number;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
  repoName: string;
}

export interface GitHubStats {
  totalCommits: number;
  totalRepos: number;
  languages: Record<string, number>;
  followers: number;
  contributions: number;
}

export async function getGitHubUser(
  username: string
): Promise<GitHubUser | null> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/users/${username}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      login: data.login,
      avatar_url: data.avatar_url,
      profile_url: data.html_url,
      public_repos: data.public_repos,
    };
  } catch (error) {
    console.error("Error fetching GitHub user:", error);
    return null;
  }
}

export async function getGitHubCommits(
  username: string,
  limit: number = 10
): Promise<GitHubCommit[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/search/commits?q=author:${username}&sort=committer-date&order=desc&per_page=${limit}`,
      {
        headers: {
          Accept: "application/vnd.github.cloak-preview+json",
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.items) return [];

    return data.items.map((commit: any) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      url: commit.html_url,
      repoName: commit.repository.name,
    }));
  } catch (error) {
    console.error("Error fetching GitHub commits:", error);
    return [];
  }
}

export async function getGitHubStats(
  username: string
): Promise<GitHubStats | null> {
  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`${GITHUB_API_BASE}/users/${username}`),
      fetch(`${GITHUB_API_BASE}/users/${username}/repos?per_page=100`),
    ]);

    if (!userRes.ok || !reposRes.ok) return null;

    const user = await userRes.json();
    const repos = await reposRes.json();

    const languages: Record<string, number> = {};
    repos.forEach((repo: any) => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    });

    return {
      totalCommits: user.public_gists || 0,
      totalRepos: user.public_repos,
      languages,
      followers: user.followers,
      contributions: user.public_repos,
    };
  } catch (error) {
    console.error("Error fetching GitHub stats:", error);
    return null;
  }
}
