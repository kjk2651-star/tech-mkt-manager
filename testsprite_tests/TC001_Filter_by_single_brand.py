import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000/campaigns", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Open the brand filter dropdown using the Mantine Select component.
        frame = context.pages[-1]
        # Click on the brand filter dropdown input to open the brand selection.
        elem = frame.locator('xpath=html/body/div[2]/main/div[2]/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Select the brand 'ASUS MB' from the brand filter dropdown.
        frame = context.pages[-1]
        # Select the 'ASUS MB' option from the brand filter dropdown.
        elem = frame.locator('xpath=html/body/div[3]/div/div/div/div/div/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        # Assert that the brand 'ASUS MB' is visible in the campaign list
        await expect(frame.locator('text=ASUS MB').first).to_be_visible(timeout=30000)
        # Assert that the campaign list contains the expected campaign plan names for ASUS MB
        await expect(frame.locator('text=25Y 9월 포토리뷰').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=25Y 8월 포토리뷰').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=25Y 7월 포토리뷰').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=다나와 광고').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=다나와 브랜드로그').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=25Y 6월 포토리뷰').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=25Y 5월 포토리뷰').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=25Y 4월 포토리뷰').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=직판 조립PC iPC 브랜드 홍보 및 소비자 판매활성화를 위한 오픈마켓 광고').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=25Y 3월 포토리뷰').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=25Y 2월 포토리뷰').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=25Y 1월 포토리뷰').first).to_be_visible(timeout=30000)
        # Assert that other brands are not visible in the campaign list
        await expect(frame.locator('text=ASUS VGA').first).not_to_be_visible(timeout=30000)
        await expect(frame.locator('text=MANLI').first).not_to_be_visible(timeout=30000)
        await expect(frame.locator('text=ASRock').first).not_to_be_visible(timeout=30000)
        await expect(frame.locator('text=INTEL').first).not_to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    