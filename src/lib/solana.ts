export async function mintNFT(name: string, symbol: string): Promise<{ success: boolean; txId: string; mint: string }> {
  console.log('[Solana] Minting NFT:', name, symbol);
  await new Promise(r => setTimeout(r, 2500));
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const txId = [...Array(64)].map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
  return { success: true, txId, mint: txId.slice(0, 4) + '...' + txId.slice(-4) };
}
