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

import assert from "node:assert";

import { lockAndProcessFile } from "./utils.js";

const PRIVATE_KEY_INDEX_FILE_PATH = "tmp/private_key_index.txt";

type Account = {
  address: string;
  privateKey: string;
};

export const LOCAL_NET_SENDER_ACCOUNT: Account = {
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  privateKey:
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
};

export const LOCAL_NET_DEFAULT_ACCOUNTS: Account[] = [
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey:
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
  {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey:
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  },
  {
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey:
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  },
  {
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    privateKey:
      "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  },
  {
    address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    privateKey:
      "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  },
  {
    address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    privateKey:
      "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  },
  {
    address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    privateKey:
      "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  },
  {
    address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    privateKey:
      "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
  },
];

/**
 * Increases the index of the default sender account to provide a unique account for each test worker
 * If the data is empty, the index is set to 0. Otherwise, the index is increased by 1.
 * If the index is out of bounds, it is reset to 0. The resulting index is returned as a string.
 *
 * @param {string} dataFromFile - The data obtained from a file.
 * @throws {Error} If the data is not a valid number.
 * @returns {string} The resulting index as a string.
 */
function getNextIndex(dataFromFile: string): string {
  let index: number;

  if (dataFromFile === "") {
    index = 0;
  } else {
    // increase the index that has already been used in the previous test worker
    index = Number(dataFromFile) + 1;
  }

  if (isNaN(index)) {
    throw Error(`Data is not a number: ${dataFromFile}`);
  }

  // if the index is out of bounds, reset it
  if (index >= LOCAL_NET_DEFAULT_ACCOUNTS.length) {
    index = 0;
  }

  return index.toString();
}

/**
 * Retrieves the unique sender account to provide it for the current test worker.
 * The account is retrieved from the LOCAL_NET_DEFAULT_ACCOUNTS array
 * using the index from the PRIVATE_KEY_INDEX_FILE_PATH file.
 *
 * @returns {Promise<Account>} - A promise that resolves to the default sender account.
 */
async function getTestDefaultSenderAccount(): Promise<Account> {
  const index = await lockAndProcessFile(
    PRIVATE_KEY_INDEX_FILE_PATH,
    getNextIndex,
  );

  const account = LOCAL_NET_DEFAULT_ACCOUNTS[Number(index)];
  assert(account !== undefined);

  return account;
}

export const TEST_DEFAULT_SENDER_ACCOUNT = await getTestDefaultSenderAccount();
