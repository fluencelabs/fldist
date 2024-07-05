#!/usr/bin/env -S node --no-warnings

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

import oclif from "@oclif/core";

import {
  createErrorPromise,
  setUpProcessWarningListener,
} from "../dist/errorInterceptor.js";

setUpProcessWarningListener();

oclif
  .run(process.argv.slice(2), import.meta.url)
  .then(oclif.flush)
  .catch(
    /** @param {unknown} error */ (error) => {
      return createErrorPromise(error);
    },
  );
