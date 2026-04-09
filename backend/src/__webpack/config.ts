import {Configuration as WebpackConfiguration, IgnorePlugin} from 'webpack';
import {TsconfigPathsPlugin} from 'tsconfig-paths-webpack-plugin';
import path from 'path';
import FilterWarningsPlugin from 'webpack-filter-warnings-plugin';

type IConfig = WebpackConfiguration;

export interface IEnv {
    mode: 'development' | 'production';
}

const config = (env: IEnv): IConfig => {
    // mode is development by default
    env.mode = env.mode ?? 'development';

    const outputPath = path.resolve(__dirname, '..', '..', 'build');
    const outputFilename = 'main.js';

    return {
        target: 'node',
        mode: env.mode,
        devtool: 'source-map',
        entry: [
            path.resolve(__dirname, '..', '..', 'src', 'main.ts'),
        ],
        resolve: {
            extensions: [
                '.ts',
                '.tsx',
                '.js',
                '.json',
            ],
            modules: [
                'node_modules',
            ],
            plugins: [
                new TsconfigPathsPlugin({
                    configFile: './tsconfig.json',
                }) as any,
            ],
        },
        output: {
            path: outputPath,
            filename: outputFilename,
            publicPath: '/',
            clean: true,
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node-modules/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                            compilerOptions: {
                                noEmitOnError: false,
                                module: 'esnext',
                                target: 'esnext',
                            },
                        },
                    },
                }
            ],
        },
        plugins: [
            new IgnorePlugin({
                checkResource: (resource) => {
                    /**
                     * There is a small problem with Nest's idea of lazy require() calls,
                     * Webpack tries to load these lazy imports that you may not be using,
                     * so we must explicitly handle the issue.
                     * Refer to: https://github.com/nestjs/nest/issues/1706
                     */
                    const lazyImports = [
                        '@nestjs/websockets/socket-module',
                        '@nestjs/platform-socket.io',
                        '@nestjs/microservices',
                        '@nestjs/microservices/microservices-module',
                        'cache-manager',
                        'class-validator',
                        'class-transformer',
                    ];
                    if (!lazyImports.includes(resource)) {
                        return false;
                    }
                    try {
                        require.resolve(resource);
                    } catch (err) {
                        return true;
                    }
                    return false;
                },
            }),
            new FilterWarningsPlugin({
                exclude: [
                    /export .+? was not found in/,
                    /Critical dependency: the request of a dependency is an expression/,
                ],
            }),
        ],

        stats: {
            all: false,
            assets: env.mode !== 'development',
            builtAt: true,
            errors: true,
            errorDetails: env.mode !== 'development',
            warnings: env.mode !== 'development',
        },
    };
};

export default config;
