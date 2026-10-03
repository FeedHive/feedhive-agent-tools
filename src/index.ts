import { installFeedHiveSkill, resolveSkillsDirectory, storeFeedHiveApiKeyInWorkspace } from './skills';
import { validateApiToken } from './token';

export { installFeedHiveSkill, resolveSkillsDirectory, storeFeedHiveApiKeyInWorkspace, validateApiToken };

export const installWithApiToken = async (apiToken: string) => {
  const validation = await validateApiToken(apiToken, 'openclaw');

  const installation = await installFeedHiveSkill();
  const apiKeyStorage = await storeFeedHiveApiKeyInWorkspace(apiToken);

  return {
    ...installation,
    ...apiKeyStorage,
    validationWarning: validation.warning,
  };
};
