/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the whole app runs in the browser and talks to Firebase directly,
  // so it can be hosted on Firebase Hosting (or any static host).
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
