import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const iconButtonVariants = cva('rounded-full p-0', {
  variants: {
    size: {
      sm: 'size-9',
      default: 'size-11',
      lg: 'size-14',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

type IconButtonProps = Omit<ButtonProps, 'size'> &
  VariantProps<typeof iconButtonVariants>;

function IconButton({ className, size, ...props }: IconButtonProps) {
  return <Button size="icon" className={cn(iconButtonVariants({ size }), className)} {...props} />;
}

export { IconButton };
export type { IconButtonProps };
