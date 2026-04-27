'use client';

import { useEffect } from 'react';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useAppState } from '@/hooks/useAppState';

export default function WalletSync() {
  const { address } = useStellarUser();
  const { setWallet } = useAppState();

  useEffect(() => {
    if (address) setWallet(address);
  }, [address, setWallet]);

  return null;
}
