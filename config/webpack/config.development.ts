import 'webpack';
import { BannerPlugin, Configuration } from 'webpack';
import resolvePath from './path';
import rules from './rules/rules';
import getPlugins from './plugins';
import devtool from './devtool';

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
          configFile: 'tsconfig.dev.json',
          transpileOnly: true,
        },
      },
    };
  }

  return rule;
});

const config: Configuration = {
  resolve: { extensions, alias },
  mode: 'development',
  target: 'node',
  entry: [resolvePath('src/cli.ts')],
  output: {
    filename: 'cli.js',
    path: resolvePath('dist'),
    clean: true,
  },
  module: {
    rules: modifiedRules,
  },
  plugins: [
    ...getPlugins('development'),
    new BannerPlugin({
      banner: '#!/usr/bin/env node',
      raw: true,
    }),
  ],
  devtool,
  performance: {
    hints: false,
  },
};

export default config;
