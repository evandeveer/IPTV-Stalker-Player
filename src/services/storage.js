const STORAGE_KEY = 'iptv_saved_profiles';

export function getSavedProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProfile(profile) {
  const profiles = getSavedProfiles();
  const idx = profiles.findIndex(
    (p) =>
      p.id === profile.id ||
      (p.macAddress &&
        p.macAddress === profile.macAddress &&
        p.macUrl === profile.macUrl)
  );
  const newProfile = {
    id: profile.id || `prof_${Date.now()}`,
    name:
      profile.name ||
      (profile.mode === 'mac'
        ? `Portail Stalker (${profile.macAddress})`
        : 'Mon Profil IPTV'),
    mode: profile.mode || 'mac',
    macUrl: profile.macUrl || '',
    macAddress: profile.macAddress || '',
    xtreamUrl: profile.xtreamUrl || '',
    xtreamUser: profile.xtreamUser || '',
    xtreamPass: profile.xtreamPass || '',
    m3uUrl: profile.m3uUrl || '',
    expiryDate:
      profile.expiryDate ||
      (idx !== -1 ? profiles[idx].expiryDate : '') ||
      '',
    updatedAt: Date.now(),
  };

  if (idx !== -1) {
    profiles[idx] = newProfile;
  } else {
    profiles.unshift(newProfile);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  return profiles;
}

export function deleteProfile(id) {
  const profiles = getSavedProfiles().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  return profiles;
}
