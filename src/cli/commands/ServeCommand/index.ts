import { LoggerService } from '$shared'
import { Command } from 'commander'
import { daemon } from '../EdgeCommand/DaemonCommand/ServeCommand/daemon'
import { syslog } from '../EdgeCommand/SyslogCommand/ServeCommand/syslog'
import { firewall } from '../FirewallCommand/ServeCommand/firewall/server'
import { mothership } from '../MothershipCommand/ServeCommand/mothership'

type Options = {
  debug: boolean
}

export const ServeCommand = () => {
  const cmd = new Command(`serve`)
    .description(`Run the entire PocketHost stack`)
    .action(async (options: Options) => {
      const logger = LoggerService().create(`ServeComand`)
      const { dbg, error, info, warn } = logger
      info(`Starting`)

      await syslog()
      await mothership()
      await daemon()
      await firewall()
    })
  return cmd
}