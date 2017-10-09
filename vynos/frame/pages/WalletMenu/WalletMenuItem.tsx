import * as React from 'react'
import {Dropdown} from 'semantic-ui-react'

export interface WalletMenuItemProps {
  name: string
  onChange: (name: string) => void
}

export default class WalletMenuItem extends React.Component<WalletMenuItemProps, {}> {
  constructor (props: WalletMenuItemProps) {
    super(props)
  }

  handleClick () {
    this.props.onChange(this.props.name)
  }

  render () {
    return <Dropdown.Item as='a' onClick={this.handleClick.bind(this)}>
      {this.props.name}
    </Dropdown.Item>
  }
}
