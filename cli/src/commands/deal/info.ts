/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { printDealInfo } from "../../lib/chain/printDealInfo.js";
import {
  CHAIN_FLAGS,
  DEAL_IDS_FLAG,
  DEPLOYMENT_NAMES_ARG,
} from "../../lib/const.js";
import { getDeals } from "../../lib/deal.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Info extends BaseCommand<typeof Info> {
  static override description = "Get info about the deal";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...DEAL_IDS_FLAG,
  };

  static override args = {
    ...DEPLOYMENT_NAMES_ARG,
  };

  async run(): Promise<void> {
    const flagsAndArgs = await initCli(this, await this.parse(Info));
    const deals = await getDeals(flagsAndArgs);

    for (const deal of deals) {
      await printDealInfo(deal);
    }
  }
}
