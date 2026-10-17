const ora = require('ora');
const config = require('./utils/config');
const helpers = require('./utils/helpers');
const api = require('./api/hianime');
const menu = require('./ui/menu');
const player = require('./player/player');
const downloader = require('./download/downloader');
const history = require('./history/history');

class AniCli {
  constructor(options = {}) {
    this.options = options;
    this.currentAnime = null;
    this.currentEpisodes = null;
    this.currentLinks = null;
    this.lastPlayedUrl = null;
  }
  
  /**
   * Main entry point
   */
  async run() {
    try {
      // Handle special commands
      if (this.options.delete) {
        return this.deleteHistory();
      }
      
      if (this.options.version) {
        console.log(config.version);
        return;
      }
      
      // Set player if specified
      if (this.options.vlc) {
        const platform = require('os').platform();
        player.setPlayer(platform === 'win32' ? 'vlc.exe' : 'vlc');
      } else if (this.options.player) {
        player.setPlayer(this.options.player);
      }
      
      // Set mode
      if (this.options.dub) {
        config.mode = 'dub';
      }
      
      // Set quality
      if (this.options.quality) {
        config.quality = this.options.quality;
      }
      
      // Set download mode
      const isDownload = this.options.download;
      if (isDownload) {
        player.setPlayer('download');
      }
      
      // Continue from history or search
      if (this.options.continue) {
        await this.continueFromHistory();
      } else {
        await this.searchAndPlay();
      }
    } catch (error) {
      if (error.message !== 'User cancelled') {
        helpers.die(error.message);
      }
    }
  }
  
  /**
   * Search and play anime
   */
  async searchAndPlay() {
    // Get search query
    let query = this.options.query;
    if (!query) {
      query = await menu.promptSearch();
    }
    
    // Search anime
    const spinner = ora('Searching...').start();
    const results = await api.searchAnime(query);
    spinner.stop();
    
    if (!results || results.length === 0) {
      helpers.die('No results found!');
    }
    
    // Select anime
    let anime;
    if (this.options.selectNth && results[this.options.selectNth - 1]) {
      anime = results[this.options.selectNth - 1];
    } else {
      anime = await menu.selectAnime(results);
    }
    
    if (!anime) {
      throw new Error('User cancelled');
    }
    
    this.currentAnime = anime;
    
    // Get episodes list
    const episodesSpinner = ora('Fetching episodes...').start();
    const episodes = await api.getEpisodesList(anime.id);
    episodesSpinner.stop();
    
    this.currentEpisodes = episodes;
    
    if (!episodes || episodes.length === 0) {
      helpers.die('No episodes found!');
    }
    
    // Select episode(s)
    let selectedEpisodes;
    if (this.options.episode) {
      selectedEpisodes = helpers.parseEpisodeRange(this.options.episode, episodes);
      if (!selectedEpisodes) {
        helpers.die('Invalid episode range!');
      }
    } else {
      const episode = await menu.selectEpisode(episodes);
      selectedEpisodes = [episode];
    }
    
    // Play episodes
    await this.playEpisodes(selectedEpisodes);
  }
  
  /**
   * Continue from history
   */
  async continueFromHistory() {
    const historyList = history.readHistory();
    
    if (!historyList || historyList.length === 0) {
      helpers.die('No history found!');
    }
    
    const selected = await menu.selectFromHistory(historyList);
    if (!selected) {
      throw new Error('User cancelled');
    }
    
    this.currentAnime = {
      id: selected.id,
      name: selected.title
    };
    
    // Get episodes list
    const spinner = ora('Fetching episodes...').start();
    const episodes = await api.getEpisodesList(selected.id);
    spinner.stop();
    
    this.currentEpisodes = episodes;
    
    // Get next episode
    const nextEpisode = history.getNextEpisode(selected.id, episodes);
    
    // Play from next episode
    await this.playEpisodes([nextEpisode]);
  }
  
  /**
   * Play episodes
   */
  async playEpisodes(episodes) {
    for (const episode of episodes) {
      await this.playEpisode(episode);
      
      // If not in download mode and not the last episode, show menu
      if (player.getPlayer() !== 'download' && episode !== episodes[episodes.length - 1]) {
        const action = await this.handlePlaybackMenu(episode);
        if (action === 'quit') {
          break;
        }
      }
    }
    
    // Interactive loop if not download mode
    if (player.getPlayer() !== 'download' && episodes.length === 1) {
      await this.interactiveLoop(episodes[0]);
    }
  }
  
  /**
   * Play single episode
   */
  async playEpisode(episode) {
    const spinner = ora(`Fetching episode ${episode}...`).start();
    
    try {
      // Get episode URLs
      const sources = await api.getEpisodeEmbedUrls(this.currentAnime.id, episode);
      
      // Generate links
      const links = await api.generateLinks(sources);
      
      if (!links || links.length === 0) {
        spinner.fail('No valid sources found!');
        return;
      }
      
      this.currentLinks = links;
      
      // Select quality
      const selectedLink = api.selectQuality(links, config.quality);
      
      if (!selectedLink) {
        spinner.fail('Failed to select quality!');
        return;
      }
      
      spinner.stop();
      
      // Play or download
      if (player.getPlayer() === 'download') {
        const filename = `${this.currentAnime.name} - Episode ${episode}`;
        await downloader.download(selectedLink.url, filename, {
          subtitle: selectedLink.subtitle,
          referer: selectedLink.referer
        });
      } else {
        await player.play(selectedLink.url, this.currentAnime.name, episode, {
          subtitle: selectedLink.subtitle,
          referer: selectedLink.referer
        });
        
        this.lastPlayedUrl = selectedLink.url;
      }
      
      // Update history
      history.updateHistory(this.currentAnime.id, this.currentAnime.name, episode);
      
    } catch (error) {
      spinner.fail(error.message);
      throw error;
    }
  }
  
  /**
   * Handle playback menu
   */
  async handlePlaybackMenu(currentEpisode) {
    const action = await menu.showPlaybackMenu(currentEpisode, this.currentAnime.name);
    
    switch (action) {
      case 'next':
        const nextEp = this.getNextEpisode(currentEpisode);
        if (nextEp) {
          await this.playEpisode(nextEp);
        } else {
          helpers.info('No more episodes');
        }
        break;
      
      case 'previous':
        const prevEp = this.getPreviousEpisode(currentEpisode);
        if (prevEp) {
          await this.playEpisode(prevEp);
        } else {
          helpers.info('Already at first episode');
        }
        break;
      
      case 'replay':
        await this.playEpisode(currentEpisode);
        break;
      
      case 'select':
        const selected = await menu.selectEpisode(this.currentEpisodes);
        if (selected) {
          await this.playEpisode(selected);
        }
        break;
      
      case 'change_quality':
        if (this.currentLinks) {
          const newLink = await menu.selectQuality(this.currentLinks);
          if (newLink) {
            await player.play(newLink.url, this.currentAnime.name, currentEpisode, {
              subtitle: newLink.subtitle,
              referer: newLink.referer
            });
          }
        }
        break;
      
      case 'quit':
        return 'quit';
    }
    
    return action;
  }
  
  /**
   * Interactive loop after playing
   */
  async interactiveLoop(startEpisode) {
    let currentEpisode = startEpisode;
    let running = true;
    
    while (running) {
      const action = await menu.showPlaybackMenu(currentEpisode, this.currentAnime.name);
      
      switch (action) {
        case 'next':
          const nextEp = this.getNextEpisode(currentEpisode);
          if (nextEp) {
            currentEpisode = nextEp;
            await this.playEpisode(currentEpisode);
          } else {
            helpers.info('No more episodes');
          }
          break;
        
        case 'previous':
          const prevEp = this.getPreviousEpisode(currentEpisode);
          if (prevEp) {
            currentEpisode = prevEp;
            await this.playEpisode(currentEpisode);
          } else {
            helpers.info('Already at first episode');
          }
          break;
        
        case 'replay':
          await this.playEpisode(currentEpisode);
          break;
        
        case 'select':
          const selected = await menu.selectEpisode(this.currentEpisodes);
          if (selected) {
            currentEpisode = selected;
            await this.playEpisode(currentEpisode);
          }
          break;
        
        case 'change_quality':
          if (this.currentLinks) {
            const newLink = await menu.selectQuality(this.currentLinks);
            if (newLink) {
              await player.play(newLink.url, this.currentAnime.name, currentEpisode, {
                subtitle: newLink.subtitle,
                referer: newLink.referer
              });
            }
          }
          break;
        
        case 'quit':
          running = false;
          break;
      }
    }
  }
  
  /**
   * Get next episode
   */
  getNextEpisode(current) {
    const index = this.currentEpisodes.indexOf(current);
    if (index !== -1 && index < this.currentEpisodes.length - 1) {
      return this.currentEpisodes[index + 1];
    }
    return null;
  }
  
  /**
   * Get previous episode
   */
  getPreviousEpisode(current) {
    const index = this.currentEpisodes.indexOf(current);
    if (index > 0) {
      return this.currentEpisodes[index - 1];
    }
    return null;
  }
  
  /**
   * Delete history
   */
  deleteHistory() {
    history.clearHistory();
    helpers.success('History cleared!');
  }
}

module.exports = AniCli;
