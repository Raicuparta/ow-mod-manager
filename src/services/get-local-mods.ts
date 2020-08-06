import fs from 'fs-extra';
import globby from 'globby';
import path from 'path';

import { modsText } from '../static-text';
import { isEnabled, manifestPartialToFull } from '.';

async function getOwml(owmlPath: string) {
  const owmlManifestPath = `${owmlPath}/OWML.Manifest.json`;
  const owmlManifest: Manifest = fs.existsSync(owmlManifestPath)
    ? await fs.readJSON(owmlManifestPath)
    : null;
  const owml: Mod = {
    name: owmlManifest?.name ?? 'OWML',
    author: owmlManifest?.author ?? 'Alek',
    uniqueName: owmlManifest?.uniqueName ?? 'Alek.OWML',
    modPath: owmlPath,
    localVersion: owmlManifest
      ? owmlManifest?.version ?? '< 0.3.43'
      : undefined,
    isEnabled: true,
    isRequired: true,
    errors: [],
    dependencies: [],
  };
  return owml;
}

export async function getLocalMods(owmlPath: string) {
  const manifestPaths = await globby(`${owmlPath}/Mods/**/manifest.json`);

  return Promise.allSettled([
    ...manifestPaths.map<Promise<Mod>>(async (manifestPath) => {
      const { manifest, missingAttributes } = manifestPartialToFull(
        await fs.readJson(manifestPath),
      );

      const mod: Mod = {
        name: manifest.name,
        author: manifest.author,
        uniqueName: manifest.uniqueName,
        localVersion: manifest.version,
        modPath: path.dirname(manifestPath),
        errors: [],
        dependencies: manifest.dependencies ?? [],
      };

      if (missingAttributes.length > 0) {
        mod.errors.push(
          modsText.missingManifestAttributesError(
            manifestPath,
            missingAttributes,
          ),
        );
      }

      try {
        mod.isEnabled = isEnabled(mod);
      } catch (error) {
        mod.errors.push(error);
      } finally {
        return mod;
      }
    }),
    getOwml(owmlPath),
  ]);
}
