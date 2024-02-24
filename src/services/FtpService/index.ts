import {
  MOTHERSHIP_INTERNAL_URL,
  PH_FTP_PASV_IP,
  PH_FTP_PASV_PORT_MAX,
  PH_FTP_PASV_PORT_MIN,
  PH_FTP_PORT,
  SSL_CERT,
  SSL_KEY,
} from '$constants'
import { LoggerService, mkSingleton } from '$shared'
import { exitHook, mergeConfig } from '$util'
import { keys, values } from '@s-libs/micro-dash'
import { readFileSync } from 'fs'
import { FtpSrv } from 'ftp-srv'
import pocketbaseEs from 'pocketbase'
import { PhFs } from './PhFs'

export type FtpConfig = { mothershipUrl: string }

export enum VirtualFolderNames {
  Backups = 'backups',
  Storage = 'storage',
  Public = 'public',
  Migrations = 'migrations',
  Hooks = 'hooks',
}

export enum PhysicalFolderNames {
  Backups = 'pb_data/backups',
  Storage = 'pb_data/storage',
  Public = 'pb_public',
  Migrations = 'pb_migrations',
  Hooks = 'pb_hooks',
}

export const FolderNamesMap: {
  [_ in VirtualFolderNames]: PhysicalFolderNames
} = {
  [VirtualFolderNames.Backups]: PhysicalFolderNames.Backups,
  [VirtualFolderNames.Storage]: PhysicalFolderNames.Storage,
  [VirtualFolderNames.Public]: PhysicalFolderNames.Public,
  [VirtualFolderNames.Migrations]: PhysicalFolderNames.Migrations,
  [VirtualFolderNames.Hooks]: PhysicalFolderNames.Hooks,
} as const

export const INSTANCE_ROOT_VIRTUAL_FOLDER_NAMES = keys(FolderNamesMap)
export const INSTANCE_ROOT_PHYSICAL_FOLDER_NAMES = values(FolderNamesMap)

export function isInstanceRootVirtualFolder(
  name: string,
): name is VirtualFolderNames {
  return INSTANCE_ROOT_VIRTUAL_FOLDER_NAMES.includes(name as VirtualFolderNames)
}

export function virtualFolderGuard(
  name: string,
): asserts name is VirtualFolderNames {
  if (!isInstanceRootVirtualFolder(name)) {
    throw new Error(`Accessing ${name} is not allowed.`)
  }
}

export const ftpService = mkSingleton((config: Partial<FtpConfig> = {}) => {
  const { mothershipUrl } = mergeConfig(
    {
      mothershipUrl: MOTHERSHIP_INTERNAL_URL(),
    },
    config,
  )
  const tls = {
    key: readFileSync(SSL_KEY()),
    cert: readFileSync(SSL_CERT()),
  }
  const _ftpServiceLogger = LoggerService().create('FtpService')
  const { dbg, info } = _ftpServiceLogger

  const ftpServer = new FtpSrv({
    url: 'ftp://0.0.0.0:' + PH_FTP_PORT(),
    anonymous: false,
    log: _ftpServiceLogger.create(`ftpServer`),
    tls,
    pasv_url: PH_FTP_PASV_IP(),
    pasv_max: PH_FTP_PASV_PORT_MAX(),
    pasv_min: PH_FTP_PASV_PORT_MIN(),
  })

  ftpServer.on(
    'login',
    async ({ connection, username, password }, resolve, reject) => {
      dbg(`Got a connection`)
      dbg(`Finding ${mothershipUrl}`)
      const client = new pocketbaseEs(mothershipUrl)
      try {
        await client.collection('users').authWithPassword(username, password)
        dbg(`Logged in`)
        const fs = new PhFs(connection, client, _ftpServiceLogger)
        resolve({ fs })
      } catch (e) {
        reject(new Error(`Invalid username or password`))
        return
      }
    },
  )

  ftpServer.listen().then(() => {
    dbg('Ftp server started...')
  })

  exitHook(() => {
    dbg(`Closing FTP server`)
    ftpServer.close()
  })

  return {}
})
