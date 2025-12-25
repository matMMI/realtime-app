reset && rm -rf .next &&
pnpm install
echo "Running Frontend Tests..."
pnpm test
if [ $? -ne 0 ]; then
  echo "Tests Failed! Stopping..."
  exit 1
fi
echo "Tests Passed! Starting Dev Server..."
pnpm run dev