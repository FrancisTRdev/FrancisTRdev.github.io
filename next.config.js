/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    trailingSlash: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'media2.dev.to',
                pathname: '/**',
            },
        ],
        unoptimized: true,
    },
};

module.exports = nextConfig;