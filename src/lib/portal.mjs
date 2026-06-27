import {loadEcosystemConfig, buildNavItems, resolvePortalBase} from './ecosystem.mjs';

export function getPortalContext() {
  const config = loadEcosystemConfig({dev: import.meta.env.DEV});
  return {
    config,
    navItems: buildNavItems(config, 'tools'),
    brandHref: `${resolvePortalBase(config, 'tools')}/`,
    brandLabel: 'Инструменты IT',
    ecosystemConfigJson: JSON.stringify({
      postMessage: config.postMessage,
      domains: config.domains,
    }),
  };
}
