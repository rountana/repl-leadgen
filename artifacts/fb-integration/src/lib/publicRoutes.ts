const artifactBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const publicAliasPath = "/fb";

export function getPublicBasePath(): string {
  const { pathname } = window.location;
  return pathname === publicAliasPath || pathname.startsWith(`${publicAliasPath}/`)
    ? publicAliasPath
    : artifactBasePath;
}