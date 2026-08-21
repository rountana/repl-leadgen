const artifactBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const publicAliasPath = "/lm";

export function getPublicBasePath(): string {
  const { pathname } = window.location;
  return pathname === publicAliasPath || pathname.startsWith(`${publicAliasPath}/`)
    ? publicAliasPath
    : artifactBasePath;
}

export function getFacebookAppBasePath(): string {
  return getPublicBasePath() === publicAliasPath ? "/fb" : "/apps/fb";
}