#!/usr/bin/env node

import { DefaultSettingsService, SETTINGS } from '$constants'
import { LogLevelName, LoggerService } from '$shared'
import { program } from 'commander'
import EventSource from 'eventsource'
import { EdgeCommand } from './commands/EdgeCommand'
import { FirewallCommand } from './commands/FirewallCommand'
import { HealthCommand } from './commands/HealthCommand'
import { HomesteadCommand } from './commands/HomesteadCommand'
import { MothershipCommand } from './commands/MothershipCommand'
import { SendMailCommand } from './commands/SendMailCommand'
export type GlobalOptions = {
  logLevel?: LogLevelName
  debug: boolean
}

DefaultSettingsService(SETTINGS)

LoggerService({})

//@ts-ignore
global.EventSource = EventSource

export const main = async () => {
  program.name('pockethost').description('Multitenant PocketBase hosting')

  program
    .addCommand(MothershipCommand())
    .addCommand(EdgeCommand())
    .addCommand(HealthCommand())
    .addCommand(FirewallCommand())
    .addCommand(SendMailCommand())
    .addCommand(HomesteadCommand())

  await program.parseAsync()
}

main()
