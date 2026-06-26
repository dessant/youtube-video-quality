<template>
  <vn-app v-if="dataLoaded" :class="appClasses">
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
        <div class="option" v-if="contributionsEnabled">
          <vn-switch
            :label="getText('optionTitle_showContribPage')"
            v-model="options.showContribPage"
          ></vn-switch>
        </div>
      </div>
    </div>

    <div
      class="section-sponsors"
      v-if="contributionsEnabled || sponsorsEnabled"
    >
      <div class="section-title" v-once>
        {{ getText('optionSectionTitle_sponsors') }}
      </div>
      <div class="option-wrap">
        <div
          class="option sponsor-logo"
          v-if="sponsorsEnabled"
          v-for="(item, index) in sponsors"
          :key="index"
        >
          <a
            :href="getSponsorUrl(item)"
            @click.prevent="showSponsor(item)"
            @keyup.enter.prevent="showSponsor(item)"
          >
            <img :src="getSponsorLogo(item, {variant: theme})" />
          </a>
        </div>
        <div class="option button" v-if="contributionsEnabled">
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
import {
  getListItems,
  showContributePage,
  showSponsorPage,
  getAppTheme,
  getSponsorUrl,
  getSponsorLogo
} from 'utils/app';
import {getText} from 'utils/common';
import {enableContributions, enableSponsors} from 'utils/config';
import {optionKeys, qualityLevels, sponsors} from 'utils/data';

export default {
  components: {
    [App.name]: App,
    [Button.name]: Button,
    [Icon.name]: Icon,
    [Switch.name]: Switch,
    [Select.name]: Select
  },

  data: function () {
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

      sponsors,

      contributionsEnabled: true,
      sponsorsEnabled: true,

      theme: '',

      options: {
        quality: '',
        limitFps: false,
        appTheme: false,
        showContribPage: false
      }
    };
  },

  computed: {
    appClasses: function () {
      return {
        'show-sponsors': this.sponsorsEnabled || this.contributionsEnabled
      };
    }
  },

  methods: {
    getText,

    getSponsorUrl,
    getSponsorLogo,

    setup: async function () {
      const options = await storage.get(optionKeys);

      for (const option of Object.keys(this.options)) {
        this.options[option] = options[option];

        this.$watch(
          `options.${option}`,
          async function (value) {
            await storage.set({[option]: toRaw(value)});
            await browser.runtime.sendMessage({id: 'optionChange'});
          },
          {deep: true}
        );
      }

      this.sponsorsEnabled = enableSponsors && !!this.sponsors.length;
      this.contributionsEnabled = enableContributions;

      this.theme = await getAppTheme(options.appTheme);
      document.addEventListener('themeChange', ev => {
        this.theme = ev.detail;
      });

      this.dataLoaded = true;
    },

    showContribute: async function () {
      await showContributePage();
    },

    showSponsor: async function (name) {
      await showSponsorPage({name});
    }
  },

  created: function () {
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
}

.section-sponsors {
  & .sponsor-logo,
  & .sponsor-logo a,
  & .sponsor-logo img {
    height: 42px;
  }

  & .sponsor-logo img {
    cursor: pointer;
  }

  & .contribute-button {
    @include vueton.theme-prop(color, primary);

    & .vn-icon {
      @include vueton.theme-prop(background-color, cta);
    }
  }

  & .button:not(:only-child) {
    margin-top: 12px;
  }
}

@media (min-width: 736px) {
  .v-application__wrap {
    justify-content: center;
  }

  .show-sponsors {
    & .v-application__wrap {
      grid-template-columns: minmax(280px, max-content) max-content;
      grid-template-rows: repeat(1, min-content) 1fr;
      grid-template-areas:
        'general sponsors'
        'misc sponsors';
    }
  }

  .section-general {
    grid-area: general;
  }

  .section-misc {
    grid-area: misc;
  }

  .section-sponsors {
    grid-area: sponsors;
  }

  & .vn-checkbox,
  & .vn-switch {
    grid-template-columns: min-content;
  }
}
</style>
