export async function simulateSlicing(fileName: string) {
  console.log(`🧩 Simulating slicing for ${fileName}...`);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        layers: Math.floor(Math.random() * 500 + 100),
        printTime: `${Math.floor(Math.random() * 3 + 1)}h ${Math.floor(
          Math.random() * 60
        )}m`,
        materialUsed: `${(Math.random() * 50 + 10).toFixed(2)}g`,
      });
    }, 3000);
  });
}
