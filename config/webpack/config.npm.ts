import 'webpack';
import { BannerPlugin, Configuration } from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import resolvePath from './path';
import rules from './rules/rules';
import getPlugins from './plugins';

const extensions = ['*', '.js', '.ts', '.tsx'];

const alias = {
  '@babel/runtime': resolvePath('node_modules/@babel/runtime'),
};

const modifiedRules = rules.map((rule) => {
  if ((rule.use as any)?.loader === 'ts-loader') {
    return {
      ...rule,
      use: {
        ...(rule.use as any),
        options: {
          ...(rule.use as any).options,
          configFile: 'tsconfig.npm.json',
        },
      },
    };
  }

  return rule;
});

const config: Configuration = {
  resolve: { extensions, alias },
  mode: 'production',
  target: 'node',
  entry: {
    openclaw: resolvePath('src/cli.ts'),
    'claude-code': resolvePath('src/claude-code-cli.ts'),
    'feedhive-cli': resolvePath('src/feedhive-cli-entry.ts'),
  },
  output: {
    filename: '[name]/cli.js',
    path: resolvePath('dist'),
    clean: true,
  },
  module: {
    rules: modifiedRules,
  },
  plugins: [
    ...getPlugins('production'),
    new BannerPlugin({
      banner: '#!/usr/bin/env node',
      raw: true,
    }),
  ],
  optimization: {
    emitOnErrors: true,
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        parallel: true,
        terserOptions: {
          compress: true,
          mangle: true,
          keep_classnames: false,
          keep_fnames: false,
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
  performance: {
    hints: false,
  },
};

export default config;
