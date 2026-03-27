<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  wx.cloud.init({
    traceUser: true
  })
})
</script>

<style lang="scss">
page {
  background-color: #0a0a0f;
  color: #e8e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
