<template>
<div id="app" v-if="dataLoaded">
  <div class="section">
    <div class="option-wrap">
      <div class="option select">
        <v-select :label="getText('optionTitle_quality')"
            v-model="options.quality"
            :options="selectOptions.quality">
        </v-select>
      </div>
    </div>
  </div>
</div>
</template>

<script>
import browser from 'webextension-polyfill';
import {Select} from 'ext-components';

import storage from 'storage/storage';
import {getOptionLabels} from 'utils/app';
import {getText} from 'utils/common';
import {optionKeys, qualityLevels} from 'utils/data';

export default {
  components: {
    [Select.name]: Select
  },

  data: function() {
    return {
      dataLoaded: false,

      selectOptions: getOptionLabels({
        quality: qualityLevels
      }),

      options: {
        quality: ''
      }
    };
  },

  methods: {
    getText
  },

  created: async function() {
    const options = await storage.get(optionKeys, 'sync');

    for (const option of Object.keys(this.options)) {
      this.options[option] = options[option];
      this.$watch(`options.${option}`, async function(value) {
        await storage.set({[option]: value}, 'sync');
      });
    }

    document.title = getText('pageTitle', [
      getText('pageTitle_options'),
      getText('extensionName')
    ]);

    this.dataLoaded = true;
  }
};
</script>

<style lang="scss">
$mdc-theme-primary: #1abc9c;

@import '@material/theme/mixins';
@import '@material/typography/mixins';

body {
  min-width: 300px;
  min-height: 200px;
  @include mdc-typography-base;
  font-size: 100%;
  background-color: #ffffff;
  overflow: visible !important;
}

#app {
  display: grid;
  grid-row-gap: 32px;
  padding: 12px;
}

.mdc-select__menu {
  left: inherit !important;
}

.section-title,
.section-desc {
  @include mdc-theme-prop('color', 'text-primary-on-light');
}

.section-title {
  @include mdc-typography('title');
}

.section-desc {
  @include mdc-typography('body1');
  padding-top: 8px;
}

.option-wrap {
  display: grid;
  grid-row-gap: 12px;
  padding-top: 16px;
}

.option {
  display: flex;
  align-items: center;
  height: 36px;
}

.option.select {
  height: 56px;
}
</style>
