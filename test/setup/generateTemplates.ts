/**
 * Copyright 2024 Fluence DAO
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { cp } from "fs/promises";
import { access } from "node:fs/promises";
import { join } from "path";

import {
  DOT_FLUENCE_DIR_NAME,
  PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
  SECRETS_DIR_NAME,
  type Template,
  TEMPLATES,
  TMP_DIR_NAME,
} from "../../src/lib/const.js";
import { fluence } from "../helpers/commonWithSetupTests.js";
import { fluenceEnv, NO_PROJECT_TEST_NAME } from "../helpers/constants.js";
import {
  getInitializedTemplatePath,
  pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
} from "../helpers/paths.js";

const [, ...restTemplatePaths] = await Promise.all(
  TEMPLATES.map((template) => {
    return initFirstTime(template);
  }),
);

const secretsPath = join(
  pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
  DOT_FLUENCE_DIR_NAME,
  SECRETS_DIR_NAME,
);

const secretsConfigPath = join(
  pathToTheTemplateWhereLocalEnvironmentIsSpunUp,
  DOT_FLUENCE_DIR_NAME,
  PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
);

await Promise.all(
  [...restTemplatePaths, join(TMP_DIR_NAME, NO_PROJECT_TEST_NAME)].map(
    (path) => {
      return Promise.all([
        cp(secretsPath, join(path, DOT_FLUENCE_DIR_NAME, SECRETS_DIR_NAME), {
          force: true,
          recursive: true,
        }),
        cp(
          secretsConfigPath,
          join(
            path,
            DOT_FLUENCE_DIR_NAME,
            PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
          ),
          {
            force: true,
            recursive: true,
          },
        ),
      ]);
    },
  ),
);

async function initFirstTime(template: Template) {
  const templatePath = getInitializedTemplatePath(template);

  try {
    await access(templatePath);
  } catch {
    await fluence({
      args: ["init", templatePath],
      flags: { template, env: fluenceEnv, "no-input": true },
    });
  }

  return templatePath;
}
