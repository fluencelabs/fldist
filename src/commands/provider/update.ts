/**
 * Copyright 2023 Fluence Labs Limited
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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { updateProvider } from "../../lib/chain/providerInfo.js";
import { CHAIN_FLAGS } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Update extends BaseCommand<typeof Update> {
  static override aliases = ["provider:u"];
  static override description = "Update provider info";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    await initCli(this, await this.parse(Update));
    await updateProvider();
  }
}
