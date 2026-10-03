import * as webpack from 'webpack';

export const babel: webpack.RuleSetRule = {
  loader: 'babel-loader',
  options: {
    cacheDirectory: true,
    rootMode: 'upward',
  },
};

export const typescript: webpack.RuleSetRule = {
  loader: 'ts-loader',
};
