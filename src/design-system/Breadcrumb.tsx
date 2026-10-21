import * as React from 'react'
import { LayoutGridIcon } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '../components/base-ui/breadcrumb'

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}

export type BreadcrumbSegment =
  | {
      label: string
      href: string
      current?: false
      icon?: React.ReactNode
    }
  | {
      label: string
      current: true
      href?: never
      icon?: React.ReactNode
    }

export interface Breadcrumb2Props {
  segments?: readonly BreadcrumbSegment[]
  className?: string
}

export const Breadcrumb2: React.FC<Breadcrumb2Props> = ({
  segments = [
    { label: 'Portal', href: '#' },
    { label: 'Orders', href: '#' },
    { label: 'Shipment Status', current: true },
  ],
  className = '',
}) => {
  const [home, ...rest] = segments
  if (!home) return null

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="px-1 py-1">
        {'href' in home ? (
          <BreadcrumbItem>
            <BreadcrumbLink
              href={home.href}
              className="flex items-center gap-2 font-medium"
            >
              {home.icon ?? <LayoutGridIcon className="size-3.5" />}
              {home.label}
            </BreadcrumbLink>
          </BreadcrumbItem>
        ) : null}

        {rest.map((segment) => (
          <BreadcrumbItem key={segment.label}>
            <BreadcrumbSeparator className="text-muted-foreground/70">
              /
            </BreadcrumbSeparator>
            {'href' in segment ? (
              <BreadcrumbLink
                href={segment.href}
                className="text-muted-foreground"
              >
                {segment.label}
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className="font-medium underline underline-offset-4">
                {segment.label}
              </BreadcrumbPage>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default Breadcrumb2
