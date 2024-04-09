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

import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { collateralWithdraw } from "../../lib/chain/commitment.js";
import { CHAIN_FLAGS, FLT_SYMBOL } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class CollateralWithdraw extends BaseCommand<
  typeof CollateralWithdraw
> {
  static override aliases = ["delegator:cw"];
  static override description = `Withdraw ${FLT_SYMBOL} collateral from capacity commitment`;
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
  };
  static override args = {
    IDS: Args.string({
      description: "Comma separated capacity commitment IDs",
    }),
  };

  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(CollateralWithdraw));
    await collateralWithdraw({ ids: args.IDS });
  }
}
