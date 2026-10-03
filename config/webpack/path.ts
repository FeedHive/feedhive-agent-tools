import { realpathSync } from 'fs';
import { resolve } from 'path';

const appDirectory = realpathSync(process.cwd());
const pathDirectory = (...pathSegments: string[]): string => resolve(appDirectory, ...pathSegments);

export default pathDirectory;
