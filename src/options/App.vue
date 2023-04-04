<template>
  <vn-app id="app" v-if="dataLoaded">
    <div class="section-general">
      <div class="section-title" v-once>
        {{ getText('optionSectionTitle_general') }}
      </div>
      <div class="option-wrap">
        <div class="option select">
          <vn-select
            :label="getText('optionTitle_quality')"
            :items="listItems.quality"
            v-model="options.quality"
            transition="scale-transition"
          >
          </vn-select>
        </div>
        <div class="option">
          <vn-switch
            :label="getText('optionTitle_limitFps')"
            v-model="options.limitFps"
          ></vn-switch>
        </div>
      </div>
    </div>

    <div class="section-misc">
      <div class="section-title" v-once>
        {{ getText('optionSectionTitle_misc') }}
      </div>
      <div class="option-wrap">
        <div class="option select">
          <vn-select
            :label="getText('optionTitle_appTheme')"
            :items="listItems.appTheme"
            v-model="options.appTheme"
            transition="scale-transition"
          >
          </vn-select>
        </div>
        <div class="option" v-if="enableContributions">
          <vn-switch
            :label="getText('optionTitle_showContribPage')"
            v-model="options.showContribPage"
          ></vn-switch>
        </div>
        <div class="option button" v-if="enableContributions">
          <vn-button
            class="contribute-button vn-icon--start"
            @click="showContribute"
            ><vn-icon
              src="/src/assets/icons/misc/favorite-filled.svg"
            ></vn-icon>
            {{ getText('buttonLabel_contribute') }}
          </vn-button>
        </div>
      </div>
    </div>
  </vn-app>
</template>

<script>
import {toRaw} from 'vue';
import {App, Button, Icon, Select, Switch} from 'vueton';

import storage from 'storage/storage';
import {getListItems, showContributePage} from 'utils/app';
import {getText} from 'utils/common';
import {enableContributions} from 'utils/config';
import {optionKeys, qualityLevels} from 'utils/data';

export default {
  components: {
    [App.name]: App,
    [Button.name]: Button,
    [Icon.name]: Icon,
    [Switch.name]: Switch,
    [Select.name]: Select
  },

  data: function() {
    return {
      dataLoaded: false,

      listItems: {
        ...getListItems(
          {quality: Object.keys(qualityLevels).reverse()},
          {scope: 'optionValue_quality'}
        ),
        ...getListItems(
          {appTheme: ['auto', 'light', 'dark']},
          {scope: 'optionValue_appTheme'}
        )
      },

      enableContributions,

      options: {
        quality: '',
        limitFps: false,
        appTheme: false,
        showContribPage: false
      }
    };
  },

  methods: {
    getText,

    setup: async function() {
      const options = await storage.get(optionKeys);

      for (const option of Object.keys(this.options)) {
        this.options[option] = options[option];

        this.$watch(
          `options.${option}`,
          async function(value) {
            await storage.set({[option]: toRaw(value)});
            await browser.runtime.sendMessage({id: 'optionChange'});
          },
          {deep: true}
        );
      }

      this.dataLoaded = true;
    },

    showContribute: async function() {
      await showContributePage();
    }
  },

  created: function() {
    document.title = getText('pageTitle', [
      getText('pageTitle_options'),
      getText('extensionName')
    ]);

    this.setup();
  }
};
</script>

<style lang="scss">
@use 'vueton/styles' as vueton;

@include vueton.theme-base;
@include vueton.transitions;

.v-application__wrap {
  display: grid;
  grid-row-gap: 32px;
  grid-column-gap: 48px;
  padding: 24px;
  grid-auto-rows: min-content;
  grid-auto-columns: min-content;
}

.section-title {
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 0.25px;
  line-height: 32px;
}

.option-wrap {
  display: grid;
  grid-row-gap: 24px;
  padding-top: 24px;
}

.option {
  display: flex;
  align-items: center;
  height: 20px;

  &.button {
    height: 40px;
  }

  &.select,
  &.text-field {
    height: 56px;
  }

  & .contribute-button {
    @include vueton.theme-prop(color, primary);

    & .vn-icon {
      @include vueton.theme-prop(background-color, cta);
    }
  }
}
</style>
