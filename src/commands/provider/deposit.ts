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

import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { depositToNox } from "../../lib/chain/depositToNox.js";
import {
  PRIV_KEY_FLAG,
  NOX_NAMES_FLAG,
  PROVIDER_CONFIG_FLAGS,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Deposit extends BaseCommand<typeof Deposit> {
  static override aliases = ["provider:d"];
  static override description = "Deposit to noxes";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...PROVIDER_CONFIG_FLAGS,
    ...NOX_NAMES_FLAG,
    amount: Flags.string({
      description: "Amount of tokens to deposit to noxes",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Deposit));
    await depositToNox(flags);
  }
}
