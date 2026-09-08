import type { CardScope, EntityKey } from './types';
import type { HomeAssistant } from './ha-types';

export const PLATFORM = 'pronote_ng';

/** Un appareil d'enfant est rattaché à un appareil de compte par via_device_id. */
export function isChildDevice(hass: HomeAssistant, deviceId: string): boolean {
  return Boolean(hass.devices[deviceId]?.via_device_id);
}

/**
 * L'appareil réellement porteur des entités de la carte.
 * Une carte de compte suit via_device_id ; l'utilisateur ne configure jamais
 * que le device_id de l'enfant.
 */
export function resolveDevice(
  hass: HomeAssistant,
  deviceId: string | undefined,
  scope: CardScope
): string | undefined {
  if (!deviceId) return undefined;
  const device = hass.devices[deviceId];
  if (!device) return undefined;
  if (scope === 'account') return device.via_device_id ?? device.id;
  return device.id;
}

export function resolveEntities(
  hass: HomeAssistant,
  deviceId: string | undefined,
  scope: CardScope,
  keys: readonly EntityKey[],
  overrides?: Record<string, string>
): Map<EntityKey, string> {
  const out = new Map<EntityKey, string>();
  const target = resolveDevice(hass, deviceId, scope);

  // Un index par appareil évite de reparcourir tout le registre par clé.
  const onDevice = target
    ? Object.values(hass.entities).filter(
        (e) => e.device_id === target && e.platform === PLATFORM
      )
    : [];

  for (const key of keys) {
    const override = overrides?.[key];
    if (override) {
      out.set(key, override);
      continue;
    }
    const sep = key.indexOf(':');
    if (sep < 0) continue;
    const domain = key.slice(0, sep);
    const translationKey = key.slice(sep + 1);
    const match = onDevice.find(
      (e) => e.translation_key === translationKey && e.entity_id.startsWith(`${domain}.`)
    );
    if (match) out.set(key, match.entity_id);
  }

  return out;
}
